import { Modal } from "antd";
import {useTranslation} from 'react-i18next'

import successImg from "../../images/success_big.png"
import { getEllipsStr, getNetworkUrl } from "../../utils"

const TxModal = ({ visible = false, txHash, setVisible }) => {
  const {t} = useTranslation();
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
            {t("TxModal.transaction_submitted")}
            </div>
            <div className="">
              <span>
              {t("TxModal.transaction_hash")}
              </span>
              {txHash&&<a
                href={`${url}/transaction/${txHash}`}
                target="_blank"
                className="content ml-1"
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
