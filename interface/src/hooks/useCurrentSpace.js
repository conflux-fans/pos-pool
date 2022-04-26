import {useLocation} from 'react-router-dom'

const useCurrentSpace = () => {
    const { pathname } = useLocation();
    return pathname.startsWith('/core') ? 'core' : 'eSpace';
}

export default useCurrentSpace;
