import {useLocation} from 'react-router-dom'

const useCurrentSpace = () => {
    const { pathname } = useLocation();
    return pathname.startsWith('/pool/core/') ? 'core' : (pathname.startsWith('/pool/e-space/') ? 'eSpace' : null);
}

export default useCurrentSpace;
