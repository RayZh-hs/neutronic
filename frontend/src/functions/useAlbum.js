import { SERVER_URL } from "@/data/constants";
import { useAxiosWithStore } from "@/functions/useAxiosWithStore";

export const {
    data: album,
    isFinished: isAlbumLoaded
} = useAxiosWithStore('neutronic-album', SERVER_URL + "/albums", 'GET');