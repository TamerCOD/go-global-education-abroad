import React from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  Globe2, 
  FileCheck, 
  BrainCircuit, 
  MessageCircle, 
  Sparkles, 
  GraduationCap, 
  Zap,
  Plane,
  Map,
  ArrowRight
} from 'lucide-react';
import { useData } from '../DataContext';

interface AboutProps {
  onOpenModal: () => void;
}

export const About: React.FC<AboutProps> = ({ onOpenModal }) => {
  const { data } = useData();
  const aboutImage1 = data?.siteConfig?.aboutImage1 || "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600&auto=format&fit=crop";
  const aboutImage2 = data?.siteConfig?.aboutImage2 || "https://images.unsplash.com/photo-1543269664-7eef42226a21?q=80&w=600&auto=format&fit=crop";
  const services = [
    {
      icon: <GraduationCap className="w-8 h-8 text-white" />,
      color: "bg-brand-600",
      title: "Поступление под ключ",
      desc: "Открываем двери в кампусы Канады, Великобритании, США и Европы. Мы знаем, как получить 'Да' от приемной комиссии."
    },
    {
      icon: <FileCheck className="w-8 h-8 text-white" />,
      color: "bg-accent-500",
      title: "Визовая поддержка",
      desc: "Сбор документов, переводы и подготовка к интервью. Твоя виза — наша забота, тебе остается только собрать чемодан."
    },
    {
      icon: <BrainCircuit className="w-8 h-8 text-white" />,
      color: "bg-purple-600",
      title: "Стратегия успеха",
      desc: "Персональный маршрут: подбираем вуз и программу, которые раскроют твои таланты и оправдают инвестиции."
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-white" />,
      color: "bg-pink-500",
      title: "Связь 24/7",
      desc: "Мы рядом в любом часовом поясе. От первого звонка до выпускного вечера — ты никогда не останешься один."
    }
  ];

  // Floating animation for decorative elements
  const floatAnim: Variants = {
    animate: {
      y: [0, -15, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section id="about" className="py-24 bg-white relative overflow-hidden font-sans">
      {/* Background: Creative Doodles */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <svg width="100%" height="100%">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-brand-200"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* --- SECTION 1: ABOUT & MISSION --- */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-full font-bold text-sm mb-6 border border-brand-100 shadow-sm">
               <Plane className="w-4 h-4 transform -rotate-45" />
               Образовательный туризм
            </div>
            
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
              Собери чемодан <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-accent-500">
                в большое будущее.
              </span>
            </h2>
            
            <p className="text-lg text-slate-600 mb-6 leading-relaxed font-medium">
              <span className="font-bold text-brand-600">Go Global</span> — это не просто агентство, это твой штурман в мире образования. Мы превращаем сложный процесс переезда в захватывающее путешествие. 
            </p>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
               Тысячи наших студентов уже гуляют по улицам Лондона, учатся в небоскребах Торонто и запускают стартапы в Калифорнии. Мы упрощаем границы, чтобы ты мог расширять горизонты.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <button 
                    onClick={onOpenModal}
                    className="px-8 py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                    Записаться на консультацию
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-8">
                <div>
                    <div className="text-3xl font-black text-slate-900 mb-1">10+</div>
                    <div className="text-xs font-bold text-slate-500 uppercase">Лет полета</div>
                </div>
                <div>
                    <div className="text-3xl font-black text-brand-600 mb-1">500+</div>
                    <div className="text-xs font-bold text-slate-500 uppercase">Вузов-партнеров</div>
                </div>
                <div>
                    <div className="text-3xl font-black text-accent-500 mb-1">∞</div>
                    <div className="text-xs font-bold text-slate-500 uppercase">Возможностей</div>
                </div>
            </div>
          </motion.div>

          <div className="relative">
             {/* Creative Visual Collage */}
             <motion.div 
                variants={floatAnim}
                animate="animate"
                className="absolute -top-16 -right-16 z-0 text-brand-100 opacity-50"
             >
                 <Map className="w-48 h-48 transform rotate-12" />
             </motion.div>

             <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative z-10 grid grid-cols-2 gap-4"
             >
                {/* Image 1: Travel/Luggage Vibe */}
                <div className="relative transform translate-y-8">
                    <img 
                        src={aboutImage1}
                        className="rounded-2xl shadow-xl w-full h-64 object-cover" 
                        alt="Planning travel" 
                    />
                    <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-lg shadow-lg">
                        <span className="text-2xl">✈️</span>
                    </div>
                </div>

                {/* Image 2: Campus Life/Success */}
                <div className="relative">
                    <img 
                        src={aboutImage2}
                        className="rounded-2xl shadow-xl w-full h-64 object-cover" 
                        alt="Students on campus" 
                    />
                     <div className="absolute -top-4 -right-4 bg-accent-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg transform rotate-12">
                        Dream Big!
                    </div>
                </div>
             </motion.div>
          </div>
        </div>

        {/* --- SECTION 2: SERVICES (The Toolkit) --- */}
        <div className="mb-32">
            <div className="text-center mb-16">
                <div className="inline-block p-2 bg-purple-100 text-purple-600 rounded-lg mb-4">
                    <BrainCircuit className="w-6 h-6" />
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Наш инструментарий</h2>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                    Мы берем на себя скучную бюрократию, чтобы ты мог сосредоточиться на выборе города мечты.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {services.map((service, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="group bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-brand-200 shadow-sm hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/0 to-${service.color.replace('bg-', '')}/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500`}></div>
                        
                        <div className="flex items-start gap-6 relative z-10">
                            <div className={`${service.color} p-4 rounded-2xl shadow-lg transform group-hover:rotate-12 transition-transform duration-300`}>
                                {service.icon}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3">{service.title}</h3>
                                <p className="text-slate-600 leading-relaxed font-medium">
                                    {service.desc}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* --- SECTION 3: PARTNERS & ADVANTAGES --- */}
        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 relative overflow-hidden text-white">
            {/* Abstract blobs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600 rounded-full blur-[100px] opacity-30"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-600 rounded-full blur-[100px] opacity-20"></div>

            <div className="relative z-10 text-center">
                <div className="inline-block p-3 bg-white/10 backdrop-blur-md rounded-full mb-6 animate-bounce">
                    <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                </div>
                
                <h2 className="text-3xl md:text-5xl font-extrabold mb-8">
                    Прямой доступ к лучшим вузам
                </h2>
                <p className="text-brand-100 text-lg md:text-xl max-w-3xl mx-auto mb-12 leading-relaxed">
                    США, Канада, Великобритания, Европа, Азия. <br/>
                    Мы работаем без посредников, что гарантирует <span className="text-white font-bold underline decoration-accent-500 decoration-4 underline-offset-4">честные цены</span> и доступ к эксклюзивным стипендиям.
                </p>

                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                    <p className="text-sm font-bold text-brand-200 uppercase tracking-widest mb-6">Официальный партнёр топ-вузов, включая</p>
                    
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                        {(data?.siteConfig?.partnerUniversities || []).map((uni, index) => {
                            if (uni.highlighted) {
                                return (
                                    <div key={index} className="group cursor-pointer">
                                        <div className="text-4xl md:text-5xl font-black text-white tracking-tighter group-hover:scale-110 transition-transform duration-300">
                                            {uni.name}
                                        </div>
                                        <div className="h-1 w-0 bg-accent-500 group-hover:w-full transition-all duration-500 mx-auto mt-2"></div>
                                    </div>
                                );
                            }
                            return (
                                <div key={index} className="text-2xl font-bold text-white/50 hover:text-white transition-colors">{uni.name}</div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-12 flex flex-col md:flex-row justify-center items-center gap-6 text-sm font-medium text-brand-200">
                     <span className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-green-400" />
                        Официальные представители
                     </span>
                     <span className="hidden md:block">•</span>
                     <span className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        Помощь со стипендиями
                     </span>
                </div>
                
                <div className="mt-10">
                    <button 
                        onClick={onOpenModal}
                        className="inline-flex items-center gap-2 text-white font-bold border-b border-accent-500 hover:text-accent-400 transition-colors"
                    >
                        Стать партнером или студентом <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

      </div>
    </section>
  );
};