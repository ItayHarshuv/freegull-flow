
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const TOUR_STEPS = [
  {
    targetId: 'main-content',
    title: 'ברוכים הבאים ל-FreeGull Flow',
    content: 'מערכת ניהול חכמה למועדון הגלישה. כאן תוכלו לנהל משמרות, ציוד, חילוצים ועוד.'
  },
  {
    targetId: 'sidebar-nav',
    title: 'תפריט הניווט',
    content: 'כאן נמצאים כל המודולים של המערכת. ניתן לעבור בין ניהול יומן, משימות, דלפק השכרות וניהול לידים.'
  },
  {
    targetId: 'header-notifications',
    title: 'מרכז התראות',
    content: 'קבלו עדכונים בזמן אמת על משימות פתוחות, שיעורים קרובים והודעות מערכת חשובות.'
  },
  {
    targetId: 'user-profile',
    title: 'פרופיל אישי והגדרות',
    content: 'גישה מהירה לאזור האישי שלכם, החלפת משתמש (לעורכים) ויציאה מהמערכת.'
  },
  {
    targetId: 'dashboard-grid',
    title: 'לוח בקרה ראשי',
    content: 'מסך הבית מרכז את כל המידע החשוב ונותן גישה מהירה לפעולות נפוצות כמו פתיחת משמרת.'
  }
];

const TourOverlay: React.FC = () => {
  const { isTourActive, endTour } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isTourActive) {
      setCurrentStep(0);
      return;
    }

    const updatePosition = () => {
      const step = TOUR_STEPS[currentStep];
      const element = document.getElementById(step.targetId);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        // Check if element is visible (has size)
        const isHidden = rect.width === 0 && rect.height === 0;
        
        if (!isHidden) {
           element.scrollIntoView({ behavior: 'auto', block: 'center' });
           // Re-measure after scroll
           const updatedRect = element.getBoundingClientRect(); 
           
           // Basic check if in viewport
           const inViewport = (
             updatedRect.top < window.innerHeight && 
             updatedRect.bottom >= 0 &&
             updatedRect.left < window.innerWidth && 
             updatedRect.right >= 0
           );

           if (inViewport) {
             setPosition({
               top: updatedRect.top,
               left: updatedRect.left,
               width: updatedRect.width,
               height: updatedRect.height
             });
             return;
           }
        }
      }
      
      setPosition(null); 
    };

    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timer);
    };
  }, [isTourActive, currentStep]);

  if (!isTourActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  let tooltipStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  };

  if (position) {
    const tooltipWidth = 320; 
    const tooltipEstimatedHeight = 250; // Estimated height of tooltip
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Horizontal: Center relative to target, but clamp to screen edges
    let left = position.left + (position.width / 2) - (tooltipWidth / 2);
    left = Math.max(10, Math.min(left, viewportWidth - tooltipWidth - 10));

    // Vertical Logic
    let top = position.top + position.height + 20; // Default: Below
    
    // Check if "Below" fits in viewport
    const fitsBelow = (top + tooltipEstimatedHeight <= viewportHeight - 10);
    
    // Calculate "Above" position
    const topAbove = position.top - tooltipEstimatedHeight - 10;
    const fitsAbove = (topAbove >= 10);

    if (!fitsBelow) {
       if (fitsAbove) {
          // If above fits better, use it
          top = topAbove;
       } else {
          // Neither fits perfectly.
          // Strategy: If element is in top half, force below. If in bottom half, force above.
          if (position.top < viewportHeight / 2) {
             top = position.top + position.height + 20;
          } else {
             top = topAbove;
          }
       }
    }

    // Safety Clamp: Ensure it NEVER goes off-screen top (negative value)
    top = Math.max(10, top);

    // Safety Clamp: Ensure it doesn't go too far down (if possible, keep at least 50px visible)
    if (top > viewportHeight - 50) {
       top = Math.max(10, viewportHeight - tooltipEstimatedHeight - 10);
       // This might overlap the element, but guarantees visibility of the text
    }

    tooltipStyle = {
      top: `${top}px`,
      left: `${left}px`,
      width: '90%',
      maxWidth: '350px'
    };
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col animate-fade-in font-sans">
      <div className="absolute inset-0 bg-slate-900/70" onClick={endTour} />

      {/* Spotlight Effect */}
      {position && (
        <div 
          className="absolute bg-transparent transition-all duration-300 ease-in-out border-4 border-white/90 rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] pointer-events-none"
          style={{
            top: position.top - 4,
            left: position.left - 4,
            width: position.width + 8,
            height: position.height + 8,
          }}
        />
      )}

      {/* Tooltip Card */}
      <div 
        className="absolute bg-white p-6 rounded-3xl shadow-2xl transition-all duration-300 text-right flex flex-col gap-4 border border-slate-200 max-h-[85vh] overflow-y-auto"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-start flex-row-reverse">
           <h3 className="text-xl font-black text-slate-900">{step.title}</h3>
           <button onClick={endTour} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <p className="text-sm font-bold text-slate-600 leading-relaxed" dir="rtl">{step.content}</p>
        
        <div className="flex justify-between items-center mt-2 flex-row-reverse">
           <div className="flex gap-1">
              {TOUR_STEPS.map((_, idx) => (
                <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentStep ? 'bg-brand w-6' : 'bg-slate-200'}`} />
              ))}
           </div>
           
           <div className="flex gap-2">
              {currentStep > 0 && (
                <button onClick={() => setCurrentStep(currentStep - 1)} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all text-slate-600">
                   <ChevronRight size={18} />
                </button>
              )}
              <button 
                onClick={() => isLastStep ? endTour() : setCurrentStep(currentStep + 1)} 
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
              >
                 {isLastStep ? 'סיים' : 'הבא'}
                 {!isLastStep && <ChevronLeft size={16} />}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TourOverlay;
