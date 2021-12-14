import { Modal } from "antd";

import successImg from "../../images/success_big.png"
import { getEllipsStr, getNetworkUrl } from "../../utils"

const TxModal = ({ visible = false, txHash, setVisible }) => {
  const url = getNetworkUrl()
  return (
    <>
      <Modal
        maskClosable={false}
        visible={visible}
        onCancel={()=>{setVisible(false)}}
        footer={null}
      >
          <div className="flex flex-col items-center ">
            <img src={successImg} alt="success" className="w-14" />
            <div className="my-2">
            Transaction Submitted.
            </div>
            <div className="">
              <span>
              Transaction Hash:
              </span>
              {txHash&&<a
                href={`${url}/transaction/${txHash}`}
                target="_blank"
                className="content"
                rel="noopener noreferrer"
              >
                {getEllipsStr(txHash, 8, 0)}
              </a>}
            </div>
          </div>
      </Modal>
    </>
  )
}
export default TxModal
