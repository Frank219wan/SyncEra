import {Leaf,Sparkles} from 'lucide-react';

export function ProgressCelebration({t}:{t:(en:string,zh:string,ms:string)=>string}){
  return <section className="learning-celebration" role="status">
    <div className="learning-celebration-art" aria-hidden="true"><Leaf size={24}/><Sparkles size={18}/><Leaf size={30}/></div>
    <div><span className="learning-eyebrow">{t('Plan complete','计划已完成','Pelan selesai')}</span><h2>{t('Every milestone has taken root.','每一个里程碑，都已经扎根。','Setiap pencapaian telah berakar.')}</h2><p>{t('Your evidence and earned growth remain in this plan history.','你的完成依据与成长记录会继续保留在计划历史中。','Bukti dan pertumbuhan anda kekal dalam sejarah pelan.')}</p></div>
  </section>;
}
