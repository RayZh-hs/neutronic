#include "json.hpp"
#include <iostream>
#include <deque>
#include <set>
#include <fstream>
#include <chrono>
using json = nlohmann::json;

int CNT = 0;
int MAXMEM = 100000000;
unsigned long long BASE=131;
unsigned long long POW[8] = {131,17161,294499921,86730203469006241,17875507469515632449,6561729160138256001,3558634572158344449,3350337366117136897};
unsigned long long pow(int n) {
  unsigned long long out = 1;
  for (int i = 0; i < 8; ++i) {
    if (n & (1 << i)) {
      out *= POW[i];
    }
  }
  return out;
}
//上右下左
int DIR[4][2] = {{0, -1}, {1, 0}, {0, 1}, {-1, 0}};

struct Particle {
  int color = -1;
  int id = -1;
  int x = -1, y = -1;
  bool isLive = false;
};

struct Portal {
  int id = -1;
  int x = -1, y = -1;
  Portal *destination = nullptr;
};

struct Block {
  int type = 0;
  Portal *portal = nullptr;
  Particle *particle = nullptr;
};


struct Move {
  Particle *particle = nullptr; //移动的Particle
  Block block; //移动到的Block
  int sx = -1, sy = -1;
  int ex = -1, ey = -1;
  int dir;
  bool cancel = false;
  unsigned long long dhash=0;
};


struct Game {
  int row = 15, column = 15;

  int state = 0;

  Block map[15][15] = {};
  std::vector<Portal> portals;
  std::vector<Particle> particles;


  void initialize(nlohmann::basic_json<> level) {
    portals.reserve(100);
    particles.reserve(100);
    row = level["meta"]["rows"];
    column = level["meta"]["columns"];
    auto containers_json = level["content"]["containers"];
    auto particles_json = level["content"]["particles"];
    Portal *temp_portal_list[20] = {};
    for (auto &container: containers_json) {
      int cx = container["column"];
      int cy = container["row"];

      if (container["type"] == "board") {
        map[cx][cy].type = 1;
      } else if (container["type"] == "portal") {
        int portal_id = container["index"];
        map[cx][cy].type = 1;
        portals.emplace_back(portal_id, cx, cy, nullptr);
        Portal *current_portal = &portals.back();
        map[cx][cy].portal = current_portal;
        if (temp_portal_list[portal_id] != nullptr) {
          Portal *paired_portal = temp_portal_list[portal_id];
          current_portal->destination = paired_portal;
          paired_portal->destination = current_portal;
        } else {
          temp_portal_list[portal_id] = current_portal;
        }
      } else {
        throw std::runtime_error(container["type"]);
      }
    }
    int i = 0;
    for (auto &particle: particles_json) {
      int px = particle["column"];
      int py = particle["row"];
      int color = (particle["color"] == "blue");
      particles.push_back({color, i, px, py, true});
      map[px][py].particle = &particles.back();
      ++i;
    }
  }

  bool check_connect() {
    std::deque<std::pair<int, int> > queue;
    bool visited[15][15] = {};

    for (auto &p: particles) {
      if (p.isLive) {
        queue.emplace_back(p.x, p.y);
        visited[p.x][p.y] = true;
        break;
      }
    }
    while (!queue.empty()) {
      auto [x, y] = queue.front();
      queue.pop_front();

      for (auto &dir: DIR) {
        int nx = x + dir[0];
        int ny = y + dir[1];

        if (nx < 0 || nx >= column || ny < 0 || ny >= row) continue;

        if (map[nx][ny].type && !visited[nx][ny]) {
          visited[nx][ny] = true;
          queue.emplace_back(nx, ny);

          if (map[nx][ny].portal != nullptr) {
            Portal *dest = map[nx][ny].portal->destination;
            if (!visited[dest->x][dest->y]) {
              visited[dest->x][dest->y] = true;
              queue.emplace_back(dest->x, dest->y);
            }
          }
        }
      }
    }

    for (auto &p: particles) {
      if (p.isLive && !visited[p.x][p.y])
        return false;
    }
    return true;
  }


  Move move(Particle &particle, int dir) {
    /*for(auto &portal:portals) {
      if(map[portal.x][portal.y].portal!=&portal&&) {
        throw std::runtime_error("Portal position wrong");
      }
    }*/

    //尝试进行操作，如果失败，返回空的Move，否则修改game并返回该Move
    Move move;
    int tarX = particle.x + DIR[dir][0];
    int tarY = particle.y + DIR[dir][1];
    if (tarX < 0 || tarX >= column || tarY < 0 || tarY >= row) return move;
    Block *tarBlock = &map[tarX][tarY];
    if (tarBlock->type == 0) {
      return move;
    }
    bool collision = false;
    if (tarBlock->particle) {
      if (tarBlock->particle->color == particle.color) {
        return move;
      } else {
        collision = true;
      }
    }
    if ((!collision) && (tarBlock->portal != nullptr)) {
      tarX = tarBlock->portal->destination->x;
      tarY = tarBlock->portal->destination->y;
      tarBlock = &map[tarX][tarY];
      if (tarBlock->particle) {
        if (tarBlock->particle->color == particle.color) {
          return move;
        } else {
          collision = true;
        }
      }
    }
    //操作前情况保存
    move.ex = tarX;
    move.ey = tarY;
    move.sx = particle.x;
    move.sy = particle.y;
    move.particle = &particle;
    move.block = *tarBlock;
    move.dir = dir;
    move.cancel = collision;

    if(!collision) {
      move.dhash = pow(move.ey*column+move.ex)*(1+particle.color)-pow(move.sy*column+move.sx)*(1+particle.color);
    } else {
      move.dhash = -pow(move.ey*column+move.ex)*(3-particle.color)-pow(move.sy*column+move.sx)*(1+particle.color);
    }

    //处理动作
    if (collision) {
      tarBlock->type = 0;
      tarBlock->particle->isLive = false;
      particle.isLive = false;
      tarBlock->particle = nullptr;
      map[particle.x][particle.y].particle = nullptr;

      if (tarBlock->portal) {
        Block &paired_block = map[tarBlock->portal->destination->x][tarBlock->portal->destination->y];
        paired_block.portal = nullptr;
        tarBlock->portal = nullptr;
      }

      if (!check_connect()) {
        state = 1;
        return move;
      }
      state = 2;
      for (auto &p: particles) {
        if (p.isLive) {
          state = 0;
          break;
        }
      }
    } else {
      map[move.sx][move.sy].particle = nullptr;
      map[move.ex][move.ey].particle = &particle;
      particle.x = move.ex;
      particle.y = move.ey;
    }

    return move;
  }


  void reverse(Move &move) {
    Block &tar_block = map[move.ex][move.ey];
    Block &start_block = map[move.sx][move.sy];
    if (!move.cancel) {
      start_block.particle = move.particle;
      start_block.particle->x = move.sx;
      start_block.particle->y = move.sy;
      tar_block.particle = nullptr;
      return;
    }


    if (move.block.portal != nullptr) {
      tar_block.portal = move.block.portal;
      Portal *other = move.block.portal->destination;
      map[other->x][other->y].portal = other;
    }

    start_block.particle = move.particle;
    tar_block.type = 1;
    tar_block.particle = move.block.particle;
    start_block.particle->x = move.sx;
    start_block.particle->y = move.sy;
    start_block.particle->isLive = true;

    tar_block.particle->x = move.ex;
    tar_block.particle->y = move.ey;
    tar_block.particle->isLive = true;
    state = 0;

  }

  unsigned long long hash() {
    unsigned long long hash = 1;
    for (int i = row-1; i >=0; --i) {
      for (int j = column-1; j >=0; --j) {
        hash *= BASE;
        if(!map[j][i].type) {
          hash+=0;
        }else {
          if(map[j][i].particle==nullptr) {
            hash+=1;
          }else {
            hash+=2+map[j][i].particle->color;
          }
        }
      }
    }
    return hash;
  }
};

std::unordered_map<unsigned long long, int> memory;
int step_cnt=0;
unsigned long long game_hash;
void dfs(Game &game, std::vector<Move> &current_sequence, int current_step, int &best_step,
         std::vector<Move> &best_move_sequence) {
  if (memory.size() > MAXMEM) {
    throw std::exception();
  }

  if (current_step >= best_step) {
    return;
  }
  for (auto &particle: game.particles) {
    if (!particle.isLive) continue;
    for (int dir = 0; dir < 4; ++dir) {
      Move move = game.move(particle, dir);
      if (move.particle == nullptr) continue;

      if (game.state == 1) {
        game.reverse(move);
        continue;
      }

      if (game.state == 2) {
        current_sequence.push_back(move);
        if (current_step + 1 < best_step) {
          best_step = current_step + 1;
          best_move_sequence = current_sequence;
        }
        current_sequence.pop_back();
        game.reverse(move);
        continue;
      }
      game_hash+=move.dhash;
      auto it = memory.find(game_hash);
      if (it != memory.end() && it->second <= current_step + 1) {
        game.reverse(move);
        game_hash-=move.dhash;
        continue;
      }
      memory[game_hash] = current_step + 1;
      current_sequence.push_back(move);
      dfs(game, current_sequence, current_step + 1, best_step, best_move_sequence);

      current_sequence.pop_back();
      game.reverse(move);
      game_hash-=move.dhash;
    }
  }
}


int main() {
  auto start = std::chrono::high_resolution_clock::now();

  std::ifstream level_file;
  level_file.open("../level/big1.json");
  Game game;
  auto level_json = json::parse(level_file);
  game.initialize(level_json);

  /*
  std::unordered_map<std::string,int> dir_map{{"up",0},{"right",1},{"down",2},{"left",3}};
  std::vector<unsigned long long> hash_vector;

  auto solution = level_json["appendix"]["recording"];
  int i=0;
  unsigned long long init_hash = game.hash();
  for(auto m:solution) {
    for(const auto& dir_str:m["direction"]) {
      int dir=dir_map[dir_str];
      auto move = game.move(game.particles[m["id"]],dir);
      unsigned long long h=game.hash();
      hash_vector.push_back(h);
      ++i;
      std::cout<<m["id"]<<" "<<dir<<std::endl;
      std::cout<<i<<" : "<<h<<","<<std::endl;
      std::cout<<(init_hash+=move.dhash)<<std::endl;
    }
  }
  std::cout<<game.state;
  */



  int best_step = 30;
  std::vector<Move> best_move_sequence;

  std::vector<Move> current_sequence;
  memory[game.hash()] = 0;
  game_hash=game.hash();
  /*
  while (true) {
    std::cout << "Move:" << std::endl;
    int id, dir;
    std::cin >> id >> dir;
    auto move = game.move(game.particles[id], dir);
    std::cout << "Move particle " << move.particle->id << " Direction:" << move.dir << " from ("
        << move.sx << "," << move.sy << ") to ("
        << move.ex << "," << move.ey << ")"
        << "Cancel" << (move.block.particle != nullptr) << std::endl;
  }*/
  dfs(game, current_sequence, 0, best_step, best_move_sequence);


  std::cout << "Searched:" << memory.size();
  // 输出结果

  if (!best_move_sequence.empty()) {
    std::cout << "Best steps: " << best_step << std::endl;
    for (const auto &move: best_move_sequence) {
      std::cout << "Move particle " << move.particle->id << " Direction:" << move.dir << " from ("
          << move.sx << "," << move.sy << ") to ("
          << move.ex << "," << move.ey << ")"
          << "Cancel" << (move.block.particle != nullptr) << std::endl;
    }
  } else {
    std::cout << "No solution found." << std::endl;
  }
/*
  for (auto h:hash_vector) {
    auto it = memory.find(h);
    if(it!=memory.end()) {
      std::cout<<it->second<<std::endl;
    }else {
      std::cout<<-1<<std::endl;
    }
  }
*/

  auto end = std::chrono::high_resolution_clock::now();
  std::chrono::duration<double> duration = end - start;
  std::cout << memory.size();
  std::cout << "Elapsed time: " << duration.count() << " seconds." << std::endl;
  return 0;
}
