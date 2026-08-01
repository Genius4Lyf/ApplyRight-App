import React from 'react';

const TemplateThumbnail = ({ type, className = '' }) => {
  // Base card style - added className prop for flexibility
  const cardBase = `w-full h-full bg-white shadow-sm border border-slate-200 relative overflow-hidden text-[0px] flex flex-col ${className}`;

  switch (type) {
    case 'applyright-band-twin':
      return (
        <div className={`${cardBase} bg-white`}>
          <div className="border-y-2 border-[#111318] bg-[#f5f5f2] px-2 py-2">
            <div className="mb-1 h-2.5 w-3/4 bg-[#111318]" />
            <div className="h-1 w-2/5 bg-[#777773]" />
          </div>
          <div className="flex flex-1 gap-2 p-2">
            <div className="w-[68%] space-y-1">
              <div className="h-1 w-2/5 bg-[#111318]" />
              <div className="h-0.5 w-full bg-slate-300" />
              <div className="h-0.5 w-5/6 bg-slate-300" />
            </div>
            <div className="flex-1 border-l border-slate-300 pl-1.5">
              <div className="mb-1 h-1 w-3/4 bg-slate-500" />
              <div className="h-0.5 w-full bg-slate-300" />
            </div>
          </div>
        </div>
      );

    case 'ats-clean':
      return (
        <div className={`${cardBase} p-2`}>
          <div className="mb-1 h-2.5 w-3/4 bg-slate-900" />
          <div className="mb-2 h-1 w-2/5 bg-slate-500" />
          <div className="space-y-1">
            <div className="h-1 w-1/3 border-b border-slate-900 bg-slate-700" />
            <div className="h-0.5 w-full bg-slate-300" />
            <div className="h-0.5 w-5/6 bg-slate-300" />
          </div>
          <div className="mt-3 space-y-1">
            <div className="h-1 w-1/3 border-b border-slate-900 bg-slate-700" />
            <div className="h-0.5 w-full bg-slate-300" />
          </div>
        </div>
      );

    case 'student-ats':
      return (
        <div className={`${cardBase} p-2`}>
          <div className="mb-1 h-2.5 w-2/3 bg-[#1d2c3d]" />
          <div className="mb-2 h-1 w-2/5 bg-[#34495e]" />
          <div className="mb-1 h-1 w-1/3 border-b border-[#34495e] bg-[#34495e]" />
          <div className="mb-2 h-0.5 w-full bg-slate-300" />
          <div className="mb-1 h-1 w-1/3 border-b border-[#34495e] bg-[#34495e]" />
          <div className="h-0.5 w-5/6 bg-slate-300" />
        </div>
      );

    case 'modern-professional':
      return (
        <div className={`${cardBase} bg-[#f7f6f2] p-2`}>
          <div className="mb-2 border-l-2 border-[#9a6b3f] pl-1.5">
            <div className="mb-1 h-2 w-3/4 bg-[#25282d]" />
            <div className="h-1 w-2/5 bg-stone-500" />
          </div>
          <div className="mb-2 h-px w-full bg-stone-300" />
          <div className="mb-1 flex items-center gap-1">
            <div className="h-1 w-1/3 bg-[#34373c]" />
            <div className="h-px flex-1 bg-stone-300" />
          </div>
          <div className="space-y-1">
            <div className="h-0.5 w-full bg-stone-300" />
            <div className="h-0.5 w-5/6 bg-stone-300" />
          </div>
        </div>
      );

    case 'slate-timeline':
      return (
        <div className={`${cardBase} flex-row`}>
          <div className="h-full w-[35%] bg-[#343d4d] p-1.5">
            <div className="mx-auto mb-3 mt-1 h-7 w-7 rounded-full bg-white/35" />
            <div className="mb-1 h-1 w-full bg-white/70" />
            <div className="h-0.5 w-4/5 bg-white/35" />
          </div>
          <div className="w-[65%] p-2">
            <div className="mb-1 h-2 w-4/5 bg-[#343d4d]" />
            <div className="mb-3 h-1 w-1/2 bg-slate-300" />
            <div className="space-y-1 border-l border-[#343d4d] pl-1.5">
              <div className="h-1 w-full bg-slate-300" />
              <div className="h-1 w-5/6 bg-slate-300" />
            </div>
          </div>
        </div>
      );

    case 'navy-portrait':
      return (
        <div className={`${cardBase} flex-row`}>
          <div className="h-full w-[36%] bg-[#193e57] p-1.5">
            <div className="mx-auto mb-3 mt-1 h-8 w-8 rounded-full border border-white bg-white/35" />
            <div className="mb-1 h-1 w-full bg-white/80" />
            <div className="h-0.5 w-4/5 bg-white/35" />
          </div>
          <div className="w-[64%] p-2.5">
            <div className="mb-1 h-3 w-4/5 bg-slate-900" />
            <div className="mb-4 h-1 w-1/2 bg-slate-400" />
            <div className="mb-1 h-1 w-1/3 bg-[#193e57]" />
            <div className="h-0.5 w-full bg-slate-300" />
          </div>
        </div>
      );

    case 'angular-corporate':
      return (
        <div className={cardBase}>
          <div className="relative h-10 overflow-hidden bg-[#314a60] p-2">
            <div className="absolute inset-0 bg-[#294157] [clip-path:polygon(0_0,100%_0,100%_100%,0_45%)]" />
            <div className="relative mb-1 h-2 w-2/3 bg-[#efd4a8]" />
            <div className="relative h-1 w-1/3 bg-white/70" />
          </div>
          <div className="space-y-1 p-2">
            <div className="h-1 w-1/3 bg-slate-800" />
            <div className="h-0.5 w-full bg-slate-300" />
            <div className="h-0.5 w-5/6 bg-slate-300" />
          </div>
        </div>
      );

    case 'sales-sidebar':
      return (
        <div className={cardBase}>
          <div className="relative h-9 p-1.5 pl-[38%]">
            <div className="absolute inset-y-1 left-[30%] right-0 bg-[#d5dfe7]" />
            <div className="relative h-2 w-4/5 bg-[#4c5158]" />
          </div>
          <div className="flex flex-1">
            <div className="h-full w-[38%] rounded-tr-xl bg-[#d5dfe7] p-1.5">
              <div className="mb-1 h-0.5 w-full bg-[#747b82]" />
              <div className="h-0.5 w-4/5 bg-[#8f98a3]" />
            </div>
            <div className="w-[62%] space-y-1 p-2">
              <div className="h-1 w-1/2 bg-[#4c5158]" />
              <div className="h-0.5 w-full bg-slate-300" />
              <div className="h-0.5 w-5/6 bg-slate-300" />
            </div>
          </div>
        </div>
      );

    case 'modern':
      return (
        <div className={cardBase}>
          <div className="h-1.5 w-full bg-[#0f766e]" />
          <div className="p-2">
            <div className="mb-1 h-2.5 w-3/4 bg-[#16232c]" />
            <div className="mb-2 h-1 w-2/5 bg-[#0f766e]" />
            <div className="mb-2 grid grid-cols-2 gap-1 bg-[#f4f7f7] p-1">
              <div className="h-0.5 bg-slate-300" />
              <div className="h-0.5 bg-slate-300" />
            </div>
            <div className="mb-1 h-1 w-1/3 border-b border-[#0f766e] bg-slate-700" />
            <div className="h-0.5 w-full bg-slate-300" />
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div className={`${cardBase} p-3 items-center text-center`}>
          <div className="w-16 h-16 rounded-full border border-slate-100 mb-2 flex items-center justify-center">
            <div className="w-1/2 h-2 bg-slate-800"></div>
          </div>
          <div className="w-1/3 h-1 bg-slate-400 mb-3"></div>
          <div className="w-full space-y-1">
            <div className="w-full h-px bg-slate-200"></div>
            <div className="w-full h-1 bg-slate-50"></div>
            <div className="w-2/3 h-1 bg-slate-100 mx-auto"></div>
          </div>
        </div>
      );

    case 'minimal-serif':
      return (
        <div className={`${cardBase} bg-[#fcfbf7] p-2`}>
          <div className="mb-2 pb-1.5">
            <div className="mb-1 h-2.5 w-3/4 bg-[#292622]" />
            <div className="h-1 w-2/5 bg-stone-500" />
          </div>
          <div className="mb-1 flex items-center gap-1">
            <div className="h-1 w-1 bg-[#7b3f35]" />
            <div className="h-1.5 w-1/3 bg-[#292622]" />
            <div className="h-px flex-1 bg-stone-300" />
          </div>
          <div className="space-y-1">
            <div className="h-0.5 w-full bg-stone-300" />
            <div className="h-0.5 w-5/6 bg-stone-300" />
            <div className="mt-2 h-0.5 w-full bg-stone-300" />
          </div>
        </div>
      );

    case 'minimal-grid':
      return (
        <div className={`${cardBase} flex-row`}>
          {/* Sidebar Grid */}
          <div className="w-1/3 bg-slate-50 h-full border-r border-slate-200 p-1 pt-2">
            <div className="w-full h-2 bg-slate-900 mb-2"></div>
            <div className="w-1/2 h-1 bg-indigo-200 mb-4"></div>
            <div className="w-full h-0.5 bg-slate-200 mb-0.5"></div>
            <div className="w-3/4 h-0.5 bg-slate-200 mb-0.5"></div>
          </div>
          {/* Content */}
          <div className="w-2/3 p-2">
            <div className="w-1/4 h-1 bg-slate-400 mb-2 mt-2 uppercase"></div>
            <div className="w-full h-1 bg-slate-300 mb-1"></div>
            <div className="w-3/4 h-1 bg-slate-300 mb-1"></div>
            <div className="w-1/4 h-1 bg-slate-400 mb-2 mt-3 uppercase"></div>
            <div className="w-full h-1 bg-slate-300"></div>
          </div>
        </div>
      );

    case 'minimal-mono':
      return (
        <div className={`${cardBase} p-2 font-mono`}>
          <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
            <div className="w-3/4 h-2 bg-slate-900 mb-1"></div>
            <div className="w-1/2 h-1 bg-slate-500"></div>
          </div>
          <div className="space-y-2">
            <div className="bg-slate-50 p-0.5 w-1/3 h-1.5 mb-1"></div>
            <div className="w-full h-1 bg-slate-300"></div>
            <div className="pl-1 border-l-2 border-slate-300">
              <div className="w-3/4 h-1 bg-slate-300"></div>
            </div>
          </div>
        </div>
      );

    case 'creative':
      return (
        <div className={`${cardBase} p-2`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>
          <div className="mt-2 w-3/4 h-3 bg-slate-900 mb-1"></div>
          <div className="w-1/4 h-1 bg-purple-500 mb-3"></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="w-full h-1 bg-slate-300"></div>
              <div className="w-full h-1 bg-slate-300"></div>
            </div>
            <div className="space-y-1">
              <div className="w-full h-1 bg-purple-100"></div>
              <div className="w-3/4 h-1 bg-purple-100"></div>
            </div>
          </div>
        </div>
      );

    case 'executive':
      return (
        <div className={`${cardBase} flex-row`}>
          <div className="w-1/4 bg-slate-800 h-full"></div>
          <div className="w-3/4 p-2">
            <div className="w-full h-px bg-slate-300 my-1"></div>
            <div className="w-3/4 h-2 bg-slate-900 font-serif mb-1"></div>
            <div className="w-full h-px bg-slate-300 my-1"></div>
            <div className="space-y-1 mt-2">
              <div className="w-full h-1 bg-slate-400"></div>
              <div className="w-full h-1 bg-slate-400"></div>
            </div>
          </div>
        </div>
      );

    case 'executive-board':
      return (
        <div className={`${cardBase} bg-white flex flex-col text-[0px]`}>
          <div className="h-1/3 bg-blue-900 w-full p-2 flex flex-col justify-center">
            <div className="w-3/4 h-1.5 bg-white mb-1"></div>
            <div className="w-1/2 h-1 bg-blue-300"></div>
          </div>
          <div className="p-2 space-y-1">
            <div className="w-1/3 h-1 bg-blue-900 mb-1"></div>
            <div className="w-full h-1 bg-slate-300"></div>
            <div className="w-full h-1 bg-slate-300"></div>
          </div>
        </div>
      );

    case 'executive-strategy':
      return (
        <div className={`${cardBase} bg-white flex flex-row text-[0px]`}>
          <div className="w-1/3 h-full bg-slate-100 border-r border-slate-300 p-1.5">
            <div className="w-full h-1.5 bg-slate-800 mb-2"></div>
            <div className="w-full h-px bg-slate-400 mb-1"></div>
            <div className="w-3/4 h-px bg-slate-400"></div>
          </div>
          <div className="w-2/3 p-1.5">
            <div className="w-1/4 h-1 bg-blue-500 mb-2 rounded-sm"></div>
            <div className="w-full h-1 bg-slate-300 mb-1"></div>
            <div className="w-full h-1 bg-slate-300"></div>
          </div>
        </div>
      );

    case 'executive-corporate':
      return (
        <div className={`${cardBase} bg-white p-2 text-[0px]`}>
          <div className="mb-2 flex">
            <div className="w-3/5">
              <div className="mb-1 h-2.5 w-full bg-[#1e2935]" />
              <div className="h-1 w-1/2 bg-slate-500" />
            </div>
            <div className="ml-auto w-1/4 border-l border-slate-300 pl-1">
              <div className="mb-1 h-0.5 w-full bg-slate-300" />
              <div className="h-0.5 w-4/5 bg-slate-300" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <div className="h-1 w-1/3 bg-[#25364a]" />
              <div className="h-px flex-1 bg-[#25364a]" />
            </div>
            <div className="h-0.5 w-full bg-slate-300" />
            <div className="h-0.5 w-full bg-slate-300" />
          </div>
        </div>
      );

    case 'the-ascent':
      return (
        <div className={`${cardBase} bg-white p-2`}>
          <div className="relative mb-2 border-b border-stone-300 pb-2 pr-9">
            <div className="mb-1 h-2.5 w-full bg-[#282725]" />
            <div className="h-1 w-1/2 bg-[#9b5d30]" />
            <div className="absolute right-0 top-0 flex items-end gap-0.5">
              <div className="h-2 w-1.5 bg-[#d8c4b3]" />
              <div className="h-4 w-1.5 bg-[#bd906d]" />
              <div className="h-6 w-1.5 bg-[#9b5d30]" />
            </div>
          </div>
          <div className="mb-1 h-1 w-2/5 border-l-2 border-[#9b5d30] bg-stone-700 pl-1" />
          <div className="space-y-1 pl-1">
            <div className="h-0.5 w-full bg-stone-300" />
            <div className="h-0.5 w-5/6 bg-stone-300" />
          </div>
        </div>
      );

    case 'swiss':
      return (
        <div className={`${cardBase} flex-row `}>
          {/* Gradient Sidebar */}
          <div className="w-1.5 h-full bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-800"></div>
          <div className="p-2 flex-1">
            <div className="w-full h-6 bg-transparent text-slate-900 font-black text-[8px] leading-none mb-2">
              JOHN
              <br />
              DOE
            </div>
            <div className="w-fill border-t-2 border-indigo-600 pt-1">
              <div className="w-1/2 h-1.5 bg-slate-800 mb-1"></div>
              <div className="w-full h-1 bg-slate-300"></div>
            </div>
          </div>
        </div>
      );

    case 'luxury':
      return (
        <div className={`${cardBase} bg-[#fcfbf9] border-[#e5dcc5] p-2 items-center`}>
          <div className="w-full h-px bg-[#c5a059] mb-2"></div>
          <div className="text-center mb-1">
            <div className="w-2/3 h-2 bg-slate-900 mx-auto italic font-serif"></div>
          </div>
          <div className="w-full h-px bg-[#e5dcc5] mb-2"></div>
          <div className="space-y-1 w-full px-1 text-center">
            <div className="w-1/2 h-0.5 bg-[#c5a059] mx-auto mb-1"></div>
            <div className="w-full h-0.5 bg-slate-400"></div>
            <div className="w-3/4 h-0.5 bg-slate-400 mx-auto"></div>
          </div>
        </div>
      );

    case 'luxury-royal':
      return (
        <div
          className={`${cardBase} bg-slate-900 border-amber-600 p-3 items-center text-center font-serif text-[0px]`}
        >
          <div className="w-10 h-10 rounded-full border border-amber-500 mb-2 mx-auto flex items-center justify-center">
            <div className="w-4 h-4 bg-amber-500 rounded-full opacity-50"></div>
          </div>
          <div className="w-3/4 h-1.5 bg-amber-500 mx-auto mb-1"></div>
          <div className="w-1/2 h-0.5 bg-amber-700 mx-auto mb-3"></div>
          <div className="w-full space-y-1">
            <div className="w-full h-0.5 bg-slate-700 box-border border-b border-amber-900"></div>
            <div className="w-full h-0.5 bg-slate-700 box-border border-b border-amber-900"></div>
          </div>
        </div>
      );

    case 'luxury-chic':
      return (
        <div
          className={`${cardBase} bg-white border-black p-3 text-center flex flex-col justify-center text-[0px]`}
        >
          <div className="w-full flex flex-col justify-between mb-3 gap-0.5">
            <div className="w-full h-1 bg-black"></div>
            <div className="w-full h-1 bg-black"></div>
          </div>
          <div className="w-1/2 h-0.5 bg-black mx-auto mb-4"></div>
          <div className="space-y-1">
            <div className="w-full h-0.5 bg-slate-300"></div>
            <div className="w-full h-0.5 bg-slate-300"></div>
          </div>
        </div>
      );

    case 'luxury-classic':
      return (
        <div className={`${cardBase} bg-slate-100 p-2 border-slate-300 text-[0px]`}>
          <div className="border-b border-slate-300 pb-2 mb-2 text-center">
            <div className="w-2/3 h-1.5 bg-slate-800 mx-auto"></div>
            <div className="w-1/3 h-0.5 bg-slate-500 mx-auto mt-1"></div>
          </div>
          <div className="space-y-1 px-1">
            <div className="w-full h-px bg-slate-400"></div>
            <div className="w-full h-px bg-slate-400"></div>
            <div className="w-3/4 h-px bg-slate-400"></div>
          </div>
        </div>
      );

    case 'luxury-gold':
      return (
        <div
          className={`${cardBase} bg-white border-b-4 border-amber-400 p-3 text-center text-[0px]`}
        >
          <div className="w-3/4 h-2 bg-slate-900 mx-auto mb-2"></div>
          <div className="w-10 h-1 bg-amber-400 mx-auto mb-3 rounded-full"></div>
          <div className="bg-slate-50 p-1 space-y-1">
            <div className="w-full h-1 bg-slate-200"></div>
            <div className="w-full h-1 bg-slate-200"></div>
          </div>
        </div>
      );

    case 'tech':
      return (
        <div className={`${cardBase} bg-slate-900 border-indigo-500 text-[0px]`}>
          <div className="bg-slate-800 w-full h-3 mb-1 flex items-center px-1 gap-0.5">
            <div className="w-1 h-1 rounded-full bg-red-500"></div>
            <div className="w-1 h-1 rounded-full bg-yellow-500"></div>
            <div className="w-1 h-1 rounded-full bg-green-500"></div>
          </div>
          <div className="px-1.5 space-y-1">
            <div className="w-1/2 h-1 bg-blue-400"></div>
            <div className="w-3/4 h-1 bg-slate-500"></div>
            <div className="w-full h-0.5 bg-slate-600 mt-1"></div>
            <div className="w-5/6 h-1 bg-green-400 opacity-60"></div>
          </div>
        </div>
      );

    case 'tech-devops':
      return (
        <div className={`${cardBase} bg-[#1e1e1e] border-green-500 p-2 font-mono text-[0px]`}>
          <div className="text-green-500 text-[4px] mb-1">$ ./cv.sh</div>
          <div className="w-3/4 h-1 bg-[#ce9178] mb-1"></div>
          <div className="space-y-1">
            <div className="flex gap-1">
              <div className="w-0.5 h-0.5 bg-green-500 mt-0.5"></div>
              <div className="w-full h-0.5 bg-[#cccccc]"></div>
            </div>
            <div className="flex gap-1">
              <div className="w-0.5 h-0.5 bg-green-500 mt-0.5"></div>
              <div className="w-3/4 h-0.5 bg-[#cccccc]"></div>
            </div>
          </div>
        </div>
      );

    case 'tech-silicon':
      return (
        <div className={`${cardBase} bg-white overflow-hidden text-[0px]`}>
          <div className="absolute top-0 right-0 w-12 h-12 bg-blue-100 rounded-full blur-xl -mr-2 -mt-2"></div>
          <div className="p-2 relative z-10">
            <div className="w-3/4 h-2 bg-slate-900 mb-1"></div>
            <div className="w-8 h-1 bg-indigo-500 rounded-full mb-2"></div>
            <div className="space-y-1">
              <div className="w-3 h-3 bg-indigo-50 rounded mb-1 flex items-center justify-center text-[4px] text-indigo-500">
                #
              </div>
              <div className="w-full h-0.5 bg-slate-300"></div>
            </div>
          </div>
        </div>
      );

    case 'tech-google':
      return (
        <div className={`${cardBase} bg-white text-[0px]`}>
          <div className="flex w-full h-1">
            <div className="flex-1 bg-[#4285F4]"></div>
            <div className="flex-1 bg-[#DB4437]"></div>
            <div className="flex-1 bg-[#F4B400]"></div>
            <div className="flex-1 bg-[#0F9D58]"></div>
          </div>
          <div className="p-2.5">
            <div className="w-3/4 h-2 bg-[#202124] mb-2"></div>
            <div className="flex gap-1 mb-2">
              <div className="w-4 h-1 bg-[#f1f3f4] rounded-full"></div>
              <div className="w-4 h-1 bg-[#f1f3f4] rounded-full"></div>
            </div>
            <div className="space-y-1">
              <div className="w-full h-0.5 bg-[#5f6368]"></div>
              <div className="w-full h-0.5 bg-[#5f6368]"></div>
            </div>
          </div>
        </div>
      );

    case 'executive-energy':
      return (
        <div className={`${cardBase} bg-white text-[0px]`}>
          <div className="relative bg-[#202a33] p-2 pl-3">
            <div className="absolute inset-y-0 left-0 w-1 bg-[#d68a00]" />
            <div className="absolute right-0 top-0 h-1 w-1/3 bg-[#d68a00]" />
            <div className="mb-1 h-2.5 w-3/4 bg-white" />
            <div className="h-1 w-2/5 bg-[#d68a00]" />
          </div>
          <div className="space-y-1 p-2">
            <div className="flex items-center gap-1">
              <div className="h-2 w-1 bg-[#d68a00]" />
              <div className="h-1 w-1/3 bg-[#202a33]" />
              <div className="h-px flex-1 bg-slate-300" />
            </div>
            <div className="h-0.5 w-full bg-slate-300" />
            <div className="h-0.5 w-5/6 bg-slate-300" />
          </div>
        </div>
      );

    case 'operations-blueprint':
      return (
        <div className={`${cardBase} bg-[#fbfaf7] text-[0px]`}>
          <div className="grid grid-cols-[68%_32%] border-t-4 border-[#18232d]">
            <div className="relative bg-[#18232d] p-2">
              <div className="mb-1 h-2.5 w-4/5 bg-white" />
              <div className="h-1 w-1/2 bg-[#ef8f22]" />
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-[#ef8f22]" />
            </div>
            <div className="space-y-1 border-l-2 border-[#ef8f22] bg-[#eef0ed] p-1.5">
              <div className="h-0.5 w-full bg-slate-400" />
              <div className="h-0.5 w-4/5 bg-slate-300" />
              <div className="h-0.5 w-full bg-slate-400" />
            </div>
          </div>
          <div className="space-y-1.5 p-2">
            <div className="flex border-y border-slate-300">
              <div className="w-1 bg-[#ef8f22]" />
              <div className="m-1 h-1 w-1/3 bg-[#18232d]" />
            </div>
            <div className="h-0.5 w-full bg-slate-300" />
            <div className="h-0.5 w-5/6 bg-slate-300" />
          </div>
        </div>
      );

    case 'energy-slb':
      return (
        <div className={`${cardBase} bg-white shadow-sm`}>
          <div className="bg-[#0114DC] w-full h-8 p-1.5 mb-2">
            <div className="w-1/2 h-1.5 bg-white opacity-90"></div>
            <div className="w-1/3 h-1 bg-white opacity-70 mt-1"></div>
          </div>
          <div className="px-2 space-y-1">
            <div className="w-full h-1 bg-slate-300"></div>
            <div className="w-full h-1 bg-slate-300"></div>
            <div className="w-3/4 h-1 bg-slate-300"></div>
          </div>
          <div className="absolute bottom-0 w-full h-1.5 bg-[#010A71]"></div>
        </div>
      );

    case 'energy-total':
      return (
        <div className={`${cardBase} bg-white`}>
          <div className="h-1.5 w-full bg-gradient-to-r from-[#D52B1E] via-[#FFD700] via-[#0F9D58] to-[#034EA2]"></div>
          <div className="p-2">
            <div className="w-2/3 h-2 bg-[#D52B1E] mb-1"></div>
            <div className="w-1/3 h-1 bg-[#034EA2] mb-3"></div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-0.5 h-0.5 bg-[#D52B1E] rounded-full"></div>
                <div className="w-full h-0.5 bg-slate-400"></div>
              </div>
              <div className="w-full h-0.5 bg-slate-400"></div>
            </div>
          </div>
        </div>
      );

    case 'energy-seplat':
      return (
        <div className={`${cardBase} bg-white border-l-[6px] border-[#008751] pl-1`}>
          <div className="p-2 border-b border-gray-100 mb-1 flex justify-between items-center">
            <div className="w-1/2 h-2 bg-[#2d3436]"></div>
            <div className="w-1/4 h-1 bg-[#008751]"></div>
          </div>
          <div className="p-2 pt-1 space-y-1">
            <div className="flex gap-1">
              <div className="w-0.5 h-full bg-[#008751]"></div>
              <div className="w-full h-1 bg-slate-300"></div>
            </div>
            <div className="w-full h-1 bg-slate-300"></div>
          </div>
          <div className="absolute bottom-0 h-1 bg-[#008751] w-full ml-[-2px]"></div>
        </div>
      );

    case 'energy-halliburton':
      return (
        <div className={`${cardBase} bg-white border-t-4 border-[#CC0000]`}>
          <div className="p-2 bg-[#f2f2f2] border-b border-slate-200 mb-2">
            <div className="w-3/4 h-2 bg-black mb-1"></div>
            <div className="w-1/2 h-1 bg-[#CC0000]"></div>
          </div>
          <div className="px-2 space-y-1">
            <div className="border-l-2 border-[#CC0000] pl-1">
              <div className="w-full h-1 bg-black mb-0.5"></div>
            </div>
            <div className="w-full h-1 bg-slate-400"></div>
          </div>
        </div>
      );

    case 'energy-nlng':
      return (
        <div className={`${cardBase} bg-white`}>
          <div className="bg-[#23854B] h-2 w-full mb-1"></div>
          <div className="p-2">
            <div className="w-2/3 h-2 bg-[#23854B] mb-2"></div>
            <div className="flex gap-1 mb-2">
              <div className="w-1/3 h-1 bg-slate-300"></div>
              <div className="w-1/3 h-1 bg-slate-300"></div>
            </div>
            <div className="space-y-1 border-t border-slate-100 pt-1">
              <div className="w-full h-1 bg-slate-400"></div>
              <div className="w-3/4 h-1 bg-slate-400"></div>
            </div>
          </div>
          <div className="absolute bottom-0 bg-[#23854B] h-1 w-full"></div>
        </div>
      );

    default:
      return (
        <div className={`${cardBase} p-2`}>
          <div className="w-1/2 h-2 bg-slate-200 mb-2"></div>
          <div className="w-full h-1 bg-slate-100 mb-1"></div>
          <div className="w-3/4 h-1 bg-slate-100"></div>
        </div>
      );
  }
};

export default TemplateThumbnail;
