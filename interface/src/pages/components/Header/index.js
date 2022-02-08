import { Layout,Button } from 'antd';
import { Link} from "react-router-dom";
import {connect as tryActivate, useAccount} from '@cfxjs/use-wallet';

const { Header } = Layout;

function HeaderComp() {
    const address = useAccount();

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