import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 font-medium cursor-pointer flex items-center justify-between gap-2 transition-all ${
          isOpen 
            ? 'border-[#00ADB5] ring-2 ring-[#00ADB5]/30' 
            : 'border-gray-300 dark:border-gray-600 hover:border-[#00ADB5]'
        }`}
      >
        <span className="text-gray-700 dark:text-white">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-5 h-5 transition-transform text-gray-400 ${isOpen ? 'rotate-180 text-[#00ADB5]' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left transition-all text-sm font-medium ${
                  value === option.value
                    ? 'bg-[#00ADB5]/20 text-[#00ADB5]'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-[#00ADB5]/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
