import axios from 'axios';
import {MINTERSCAN_API_URL} from "~/assets/variables";

export default axios.create({
    baseURL: MINTERSCAN_API_URL,
});
