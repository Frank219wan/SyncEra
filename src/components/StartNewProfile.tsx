import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Modal} from '../components';
import {useApp} from '../store';

export function StartNewProfileButton(){
  const {startNewProfile,t}=useApp();
  const navigate=useNavigate();
  const [confirming,setConfirming]=useState(false);
  return <>
    <button type="button" className="button secondary" onClick={()=>setConfirming(true)}>{t('Start New Profile','开始新画像','Mulakan profil baharu')}</button>
    {confirming&&<Modal title={t('Start a new profile?','开始新画像？','Mulakan profil baharu?')} onClose={()=>setConfirming(false)}>
      <p>{t('This clears your current Individual draft, psychology answers, career matches and learning plans saved in this browser. It does not delete previous server-side profiles or Organization data.','这会清除当前浏览器保存的个人草稿、心理问卷答案、职业推荐和学习计划；不会删除服务器上的旧画像或机构资料。','Ini memadam draf Individu, jawapan penilaian, padanan kerjaya dan pelan pembelajaran dalam pelayar ini. Profil lama pada pelayan dan data Organisasi tidak dipadam.')}</p>
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={()=>setConfirming(false)}>{t('Cancel','取消','Batal')}</button>
        <button type="button" className="button" onClick={()=>{startNewProfile();setConfirming(false);navigate('/individual/intake/start');}}>{t('Start New Profile','开始新画像','Mulakan profil baharu')}</button>
      </div>
    </Modal>}
  </>;
}
