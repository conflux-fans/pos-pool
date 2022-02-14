import {Modal} from 'antd'
import {useTranslation} from 'react-i18next'

function ConfirmModal({type, visible, setVisible, onOk}) {
  const {t} = useTranslation()

  let content = <></>
  let okText = ''
  switch (type) {
    case 'stake':
      okText = t('ConfirmModal.stake')
      content = (
        <div>
          <div className="text-center text-error text-base font-bold mt-2 mb-4">
            {t('ConfirmModal.stake_1')}
          </div>
          <div className="leading-6">{t('ConfirmModal.stake_2')}</div>
          <div className="leading-6">{t('ConfirmModal.stake_3')}</div>
          <div className="leading-6">{t('ConfirmModal.stake_4')}</div>
        </div>
      )
      break
    case 'unstake':
      okText = t('ConfirmModal.unstake')
      content = (
        <div>
          <div>{t('ConfirmModal.unstake_1')}</div>
          <div>{t('ConfirmModal.unstake_2')}</div>
          <div>{t('ConfirmModal.unstake_3')}</div>
        </div>
      )
      break
    default:
      break
  }
  return (
    <Modal
      title="Confirm"
      visible={visible}
      onOk={onOk}
      okText={okText}
      onCancel={() => {
        setVisible(false)
      }}
    >
      {content}
    </Modal>
  )
}
export default ConfirmModal
