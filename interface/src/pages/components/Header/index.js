import { Layout,Button } from 'antd';
import { Link} from "react-router-dom";

import {useConnect} from '../../../hooks/usePortal'

const { Header } = Layout;

function HeaderComp() {
    const {address,tryActivate}=useConnect()
    return (
      <Header style={{width: '100%' }}>
        <div className='flex justify-between text-white bg-main-back bg-opacity-0'>
          <Link to="/">Pos Pool</Link>
          <div>
          {address&&<div>{address}</div>}
          {!address&&<Button type='primary' onClick={tryActivate}>Connect Portal</Button>}
          </div>
        </div>
      </Header>
    );
  }
  
  export default HeaderComp;