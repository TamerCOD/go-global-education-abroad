import React from 'react';
import { useData } from '../DataContext';
import { Quote } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

export const Testimonials: React.FC = () => {
  const { data } = useData();
  const TESTIMONIALS = data.testimonials;
  
  // Duplicate array to create seamless loop
  const marqueeVariants: Variants = {
    animate: {
      x: [0, -1035], // Adjust based on card width + gap * count
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop",
          duration: 30, // Slower duration
          ease: "linear",
        },
      },
    },
  };

  return (
    <section id="testimonials" className="py-24 bg-slate-50 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Студенты Go Global</h2>
        <p className="text-lg text-slate-600">Они уже сделали свой выбор. Теперь твоя очередь.</p>
      </div>

      <div className="relative w-full">
         <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 to-transparent z-10"></div>
         <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 to-transparent z-10"></div>
         
         <div className="flex overflow-hidden">
            <motion.div
                className="flex gap-8 px-4"
                variants={marqueeVariants}
                animate="animate"
            >
                {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => (
                    <div
                        key={`${testimonial.id}-${index}`}
                        className="flex-shrink-0 w-[350px] bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-100 flex flex-col"
                    >
                        <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-bold text-slate-900 leading-tight">{testimonial.name}</h3>
                                <div className="text-xs font-bold text-brand-600 uppercase mt-1 bg-brand-50 px-2 py-0.5 rounded-full inline-block">
                                    {testimonial.university}
                                </div>
                            </div>
                        </div>

                        <div className="flex-grow">
                            <Quote className="w-6 h-6 text-brand-200 mb-2 transform rotate-180" />
                            <p className="text-slate-700 italic mb-3 font-medium text-lg">"{testimonial.quote}"</p>
                            <p className="text-sm text-slate-500">{testimonial.story}</p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                             <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Student ID</span>
                             <div className="flex gap-1">
                                 <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                 <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                             </div>
                        </div>
                    </div>
                ))}
            </motion.div>
         </div>
      </div>
    </section>
  );
};