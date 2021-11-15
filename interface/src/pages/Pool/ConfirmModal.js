import { Modal } from "antd";

function ConfirmModal({ type, visible, setVisible, onOk }) {
  let content = <></>;
  let okText=''
  switch (type) {
    case "stake":
        okText='stake'  
      content = (
        <div>
          <div className="text-center text-error text-base font-bold mt-2 mb-4">Unstake need 7 + 7 days</div>  
          <div className="leading-6">According to Conflux PoS mechanism.</div>
          <div className="leading-6">
            When you staked your CFX, those CFX can unstake after 7 days.
          </div>
          <div className="leading-6">
            After submitting the Unstake transaction, you need to wait a 7-day
            lock-up to claim your CFX.
          </div>
        </div>
      );
      break;
    case "unstake":
        okText='unstake' 
      content = (
        <div>
          <div>You need to wait a 7-day lock-up to claim your CFX.</div>
          <div>No profit during 7-day lock-up.</div>
          <div>The proformance fee will be charged.</div>
        </div>
      );
      break;
    default:
      break;
  }
  return (
    <Modal
      title="Confirm"
      visible={visible}
      onOk={onOk}
      okText={okText}
      onCancel={()=>{setVisible(false)}}
    >
      {content}
    </Modal>
  );
}
export default ConfirmModal;
