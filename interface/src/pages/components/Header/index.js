import { Layout } from 'antd';
const { Header } = Layout;

function HeaderComp() {
    return (
      <Header>
        <div className='flex justify-between text-white'>
          <div>Pos Pool</div>
          <div>Connect Portal</div>
        </div>
      </Header>
    );
  }
  
  export default HeaderComp;