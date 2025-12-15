import { SERVER_URL } from "@/data/constants";
import { useAxiosWithStore } from "@/functions/useAxiosWithStore";

export const {
    data: album,
    isFinished: isAlbumLoaded,
    error: albumError,
} = useAxiosWithStore('neutronic-album', `${SERVER_URL}/albums`, 'GET', undefined, {
    validate: Array.isArray,
});
