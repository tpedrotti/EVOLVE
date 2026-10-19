import React, { useState } from 'react';
import { Icon } from './Icons';

interface AddWaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWater: (amountL: number) => void;
  currentLiters: number;
  goalLiters?: number;
}

const WATER_PRESETS = [
  { ml: 100, label: '100 ml', desc: 'Bicchierino / Sorsi' },
  { ml: 200, label: '200 ml', desc: 'Bicchiere piccolo' },
  { ml: 250, label: '250 ml', desc: 'Bicchiere medio' },
  { ml: 330, label: '330 ml', desc: 'Lattina / Tazza' },
  { ml: 500, label: '500 ml', desc: 'Bottiglietta' },
  { ml: 750, label: '750 ml', desc: 'Borraccia gym' },
  { ml: 1000, label: '1000 ml', desc: '1 Litro' },
];

export const AddWaterModal: React.FC<AddWaterModalProps> = ({
  isOpen,
  onClose,
  onAddWater,
  currentLiters,
  goalLiters = 3.0,
}) => {
  const [selectedMl, setSelectedMl] = useState<number>(250);
  const [isSubtractMode, setIsSubtractMode] = useState<boolean>(false);

  if (!isOpen) return null;

  const amountL = selectedMl / 1000;
  const deltaL = isSubtractMode ? -amountL : amountL;
  const projectedLiters = Math.max(0, Math.min(5.0, Number((currentLiters + deltaL).toFixed(2))));
  const projectedPct = Math.min(100, Math.round((projectedLiters / goalLiters) * 100));

  const handleApply = () => {
    if (selectedMl <= 0) return;
    onAddWater(deltaL);
    onClose();
  };

  const adjustMl = (step: number) => {
    setSelectedMl((prev) => Math.max(25, Math.min(3000, prev + step)));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#17211D]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#e2e8e4]">
        {/* Header */}
        <div className="p-5 border-b border-[#eceeed] flex items-center justify-between bg-[#f8faf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#84cc16]/20 flex items-center justify-center text-[#386a00]">
              <Icon name="water_drop" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[#191c1c]">Aggiungi Idratazione</h2>
              <p className="text-[12px] text-[#56615c]">Scegli o inserisci la quantità d'acqua</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi modale"
            className="w-8 h-8 rounded-full bg-[#e6e9e8] text-[#56615c] hover:bg-[#d7e2dc] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Main Quantity Stepper Display */}
          <div className="bg-[#f2f4f3] rounded-2xl p-4 flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 w-full">
              <button
                type="button"
                onClick={() => adjustMl(-50)}
                className="w-10 h-10 rounded-full bg-white hover:bg-[#e6e9e8] text-[#191c1c] shadow-xs flex items-center justify-center font-bold text-[18px] transition-transform active:scale-90 cursor-pointer"
                title="-50 ml"
              >
                -
              </button>

              <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    min={25}
                    max={3000}
                    step={25}
                    value={selectedMl}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setSelectedMl(Math.max(0, Math.min(3000, val)));
                      }
                    }}
                    className="w-28 text-center text-[34px] font-extrabold text-[#191c1c] bg-transparent border-b-2 border-transparent focus:border-[#84cc16] focus:outline-none"
                  />
                  <span className="text-[18px] font-bold text-[#56615c]">ml</span>
                </div>
                <span className="text-[12px] font-semibold text-[#386a00]">
                  ({(selectedMl / 1000).toFixed(2)} L)
                </span>
              </div>

              <button
                type="button"
                onClick={() => adjustMl(50)}
                className="w-10 h-10 rounded-full bg-white hover:bg-[#e6e9e8] text-[#191c1c] shadow-xs flex items-center justify-center font-bold text-[18px] transition-transform active:scale-90 cursor-pointer"
                title="+50 ml"
              >
                +
              </button>
            </div>

            {/* Micro Stepper pills */}
            <div className="flex items-center gap-2 mt-3">
              {[-100, -50, +50, +100].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => adjustMl(step)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/80 hover:bg-white text-[#424936] shadow-2xs transition-colors cursor-pointer"
                >
                  {step > 0 ? `+${step}` : step} ml
                </button>
              ))}
            </div>
          </div>

          {/* Presets Grid */}
          <div>
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-2.5">
              Quantità comuni
            </span>
            <div className="grid grid-cols-2 gap-2">
              {WATER_PRESETS.map((preset) => {
                const isSelected = selectedMl === preset.ml;
                return (
                  <button
                    key={preset.ml}
                    type="button"
                    onClick={() => setSelectedMl(preset.ml)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#84cc16] bg-[#84cc16]/10 ring-1 ring-[#84cc16]'
                        : 'border-[#e2e8e4] bg-[#f8faf9] hover:bg-[#f2f4f3]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-[#191c1c]">{preset.label}</span>
                      <span className="text-[11px] text-[#386a00] font-semibold">
                        +{(preset.ml / 1000).toFixed(2)}L
                      </span>
                    </div>
                    <span className="text-[11px] text-[#56615c] mt-0.5">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Projection Indicator */}
          <div className="bg-[#f8faf9] p-3.5 rounded-xl border border-[#eceeed] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#56615c] block">Previsione Idratazione:</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[15px] font-bold text-[#191c1c]">
                  {currentLiters.toFixed(2)} L
                </span>
                <span className="text-[13px] text-[#56615c]">➔</span>
                <span className="text-[16px] font-extrabold text-[#386a00]">
                  {projectedLiters.toFixed(2)} L
                </span>
                <span className="text-[12px] text-[#56615c]">/ {goalLiters.toFixed(1)} L</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[14px] font-bold text-[#386a00]">{projectedPct}%</span>
              <span className="text-[11px] text-[#56615c] block">dell'obiettivo</span>
            </div>
          </div>

          {/* Toggle Subtract / Correzione */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[12px] text-[#56615c]">Hai inserito troppa acqua per sbaglio?</span>
            <button
              type="button"
              onClick={() => setIsSubtractMode(!isSubtractMode)}
              className={`text-[12px] font-bold px-3 py-1 rounded-full transition-colors cursor-pointer ${
                isSubtractMode
                  ? 'bg-red-100 text-red-700'
                  : 'bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c]'
              }`}
            >
              {isSubtractMode ? 'Modalità: Sottrai' : 'Sottrai invece'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#eceeed] bg-[#f8faf9] flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-full border border-[#d7e2dc] bg-white text-[#191c1c] font-bold text-[14px] hover:bg-[#f2f4f3] transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleApply}
            className={`flex-2 py-3 px-6 rounded-full font-bold text-[15px] shadow-sm transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
              isSubtractMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#84cc16] hover:bg-[#91db2a] text-[#102000]'
            }`}
          >
            <Icon name={isSubtractMode ? 'remove' : 'add'} className="w-5 h-5" />
            <span>
              {isSubtractMode ? `Sottrai -${selectedMl} ml` : `Aggiungi +${selectedMl} ml`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
