/* F-08 — كراسة تشخيص المبنى (4 sub-steps). */

import React, { useState } from 'react';
import {
  Home, Users, ClipboardList, Sofa, PenTool, FileSignature, Lock,
  AlertTriangle, Plus, Trash2, ChevronUp, ChevronDown, Image as ImageIcon, X,
} from 'lucide-react';
import { DarkCard, DarkInput, DarkSelect, DarkTextArea, DarkReadOnlyField, DarkNumberCounter } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const F08_DEFAULTS = {
  general: { caseRef: '', projectNumber: '', familyName: '', contactNumber: '', cityNeighborhood: '', partnerEntity: '', partnerRep: '', repContact: '', safetyHazard: false },
  visit: { date: new Date().toISOString().split('T')[0], type: 'منزل', area: '', age: '', team: '', diagnosis: 'المبنى قابل للترميم', summary: '' },
  works: [] as any[],
  furnitureInfo: { type: 'منزل', males: 0, females: 0, condition: 'ترميم' },
  furnitureItems: { bed15: 0, mattress15: 0, bed1: 0, mattress1: 0, bedDouble: 0, mattressDouble: 0, carpet: 0, sofaSeats: 0, floorSeating: 0, nightstand: 0, wardrobe2: 0, dresser: 0, wardrobe3: 0, wardrobe4: 0, sofaMeters: 0 },
  appliances: { acSplit1: 0, acWindow15: 0, acSplit15: 0, washer: 0, vacuum: 0, waterCooler: 0, fridge: 0, stove: 0 },
  diagnosisNotes: '',
  pledge: false,
};

const FormF08Diagnosis: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const hydrated: any = { ...F08_DEFAULTS, ...(rec?.data || {}) };
  const [data, setData] = useState<any>(hydrated);
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const steps = [
    { id: 0, title: 'الأساسية', icon: Home },
    { id: 1, title: 'حصر الأعمال', icon: ClipboardList },
    { id: 2, title: 'الأثاث والأجهزة', icon: Sofa },
    { id: 3, title: 'الاعتماد والرفع', icon: FileSignature },
  ];

  const updateNestedData = (section: string, field: string, value: any) =>
    setData((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));

  const addWorkSpace = () => {
    const newSpace = {
      id: Date.now(), name: '', isExpanded: true, images: [],
      civil: { concrete: '', roof: '', insulation: '', shinko: '', ceramic: '', paint: '', plaster: '', wood: '', aluminum: '', steel: '', notes: '' },
      electrical: { panel: 0, ceilingLight: 0, concreteLight: 0, spotlight: 0, sockets: 0, doubleSwitch: 0, acSwitch: 0, heaterSocket: 0 },
      plumbing: { toiletFr: 0, toiletAr: 0, heater: 0, bidet: 0, showerMixer: 0, sink: 0, sinkMixer: 0, exhaust: 0 },
    };
    setData((prev: any) => ({ ...prev, works: [...prev.works, newSpace] }));
  };

  const toggleExpand = (id: number) =>
    setData((prev: any) => ({ ...prev, works: prev.works.map((w: any) => w.id === id ? { ...w, isExpanded: !w.isExpanded } : w) }));
  const removeWorkSpace = (id: number) =>
    setData((prev: any) => ({ ...prev, works: prev.works.filter((w: any) => w.id !== id) }));
  const updateWorkSpace = (id: number, category: string | null, field: string, value: any) =>
    setData((prev: any) => ({
      ...prev,
      works: prev.works.map((w: any) => {
        if (w.id === id) {
          if (category) return { ...w, [category]: { ...w[category], [field]: value } };
          return { ...w, [field]: value };
        }
        return w;
      }),
    }));

  const handleImageUpload = (spaceId: number, e: any) => {
    const files = Array.from(e.target.files || []).map((f: any) => ({ name: f.name, previewUrl: URL.createObjectURL(f) }));
    setData((prev: any) => ({ ...prev, works: prev.works.map((w: any) => w.id === spaceId ? { ...w, images: [...(w.images || []), ...files] } : w) }));
    e.target.value = null;
  };
  const removeImage = (spaceId: number, imgIdx: number) =>
    setData((prev: any) => ({
      ...prev,
      works: prev.works.map((w: any) => {
        if (w.id === spaceId) {
          const imgs = [...(w.images || [])];
          if (imgs[imgIdx]?.previewUrl) URL.revokeObjectURL(imgs[imgIdx].previewUrl);
          imgs.splice(imgIdx, 1);
          return { ...w, images: imgs };
        }
        return w;
      }),
    }));

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      if (rec) {
        await api.approveForm(rec.id, user, 'اعتماد كراسة التشخيص', data);
      } else {
        await api.createForm({
          code: 'F-08', user,
          projectId: project.projectId || '',
          projectRefId: project.id,
          beneficiaryName: project.beneficiaryName,
          data,
        });
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex overflow-x-auto gap-2 mb-4 bg-[#0a0a0a] p-1.5 rounded-xl border border-gray-800 hide-scrollbar">
        {steps.map((step) => (
          <button key={step.id} onClick={() => setCurrentStep(step.id)} className={`flex-1 flex min-w-[100px] items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold transition-all ${currentStep === step.id ? 'bg-[#1a0f2e] text-[#a871f7] border border-[#3c1d5d]' : 'text-gray-500 hover:bg-[#111]'}`}>
            <span className="whitespace-nowrap">{step.title}</span>
          </button>
        ))}
      </div>

      <div className={`${currentStep === 0 ? 'block' : 'hidden'}`}>
        <DarkCard title="بيانات الأسرة والمنزل (تُجلب من F-02)" icon={Home}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <DarkReadOnlyField label="اسم الأسرة" value={project.beneficiaryName} />
            <DarkReadOnlyField label="رقم التواصل" value={data.general.contactNumber} />
            <DarkReadOnlyField label="رقم الحالة المرجعي" value={data.general.caseRef || '—'} />
            <DarkInput disabled={dis} label="رقم المشروع" value={project.projectId || data.general.projectNumber} onChange={(e: any) => updateNestedData('general', 'projectNumber', e.target.value)} />
            <DarkInput disabled={dis} label="المدينة – الحي" value={data.general.cityNeighborhood} onChange={(e: any) => updateNestedData('general', 'cityNeighborhood', e.target.value)} />
            <DarkInput disabled={dis} label="الجهة الشريكة" value={data.general.partnerEntity} onChange={(e: any) => updateNestedData('general', 'partnerEntity', e.target.value)} />
          </div>

          <hr className="my-5 border-gray-800" />
          <h4 className="font-bold text-sm text-[#a871f7] mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> زيارة التشخيص</h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <DarkInput disabled={dis} label="تاريخ الزيارة" type="date" value={data.visit.date} onChange={(e: any) => updateNestedData('visit', 'date', e.target.value)} />
            <DarkSelect disabled={dis} label="نوع المبنى" options={['منزل', 'شقة', 'فيلا', 'شعبي']} value={data.visit.type} onChange={(e: any) => updateNestedData('visit', 'type', e.target.value)} />
            <DarkInput disabled={dis} label="المساحة التقريبية" value={data.visit.area} onChange={(e: any) => updateNestedData('visit', 'area', e.target.value)} />
            <DarkInput disabled={dis} label="العمر التقديري" value={data.visit.age} onChange={(e: any) => updateNestedData('visit', 'age', e.target.value)} />
          </div>

          <div className="bg-[#111] p-4 rounded-lg border border-gray-800 mb-5">
            <label className="block text-xs font-semibold text-gray-400 mb-3">النتيجة المبدئية للزيارة</label>
            <div className="flex flex-wrap gap-3">
              {['المبنى قابل للترميم', 'المبنى لا يحتاج للترميم', 'المبنى آيل للسقوط', 'يحول صيانة'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer bg-[#050505] px-3 py-2 rounded-md border border-gray-800 text-gray-300 hover:border-[#43bba1] transition-colors">
                  <input disabled={dis} type="radio" value={opt} checked={data.visit.diagnosis === opt} onChange={e => updateNestedData('visit', 'diagnosis', e.target.value)} className="accent-[#43bba1] w-4 h-4" />
                  <span className="text-xs font-medium">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 transition-all border-2 ${data.general.safetyHazard ? 'bg-[#3a1515] border-red-500/50' : 'bg-[#0a0a0a] border-gray-800'}`}>
            <input disabled={dis} type="checkbox" id="safetyHazard" checked={!!data.general.safetyHazard} onChange={(e) => updateNestedData('general', 'safetyHazard', e.target.checked)} className="w-5 h-5 mt-1 rounded accent-red-600 cursor-pointer" />
            <label htmlFor="safetyHazard" className="cursor-pointer select-none">
              <div className="flex items-center gap-2 text-sm font-bold text-red-500"><AlertTriangle size={18} /> تنبيه سلامة: المبنى يشكل خطراً إنشائياً (يفعل طلب الإخلاء F-18 والسكن البديل F-22)</div>
            </label>
          </div>

          <DarkTextArea disabled={dis} label="ملخص تقييم المبنى" rows={3} value={data.visit.summary} onChange={(e: any) => updateNestedData('visit', 'summary', e.target.value)} />
        </DarkCard>
      </div>

      <div className={`${currentStep === 1 ? 'block' : 'hidden'}`}>
        <DarkCard title="حصر كميات الأعمال (البنود المبدئية)" icon={ClipboardList}>
          <div className="space-y-4">
            {data.works.length === 0 ? (
              <div className="bg-[#050505] p-8 rounded-xl text-center border-2 border-dashed border-gray-800">
                <ClipboardList className="w-12 h-12 text-[#502b79] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-400 mb-1">لا توجد مساحات مضافة</h3>
                {isEditable && <button onClick={addWorkSpace} className="mt-4 mx-auto bg-[#1a0f2e] text-[#a871f7] border border-[#3c1d5d] px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> إضافة مساحة (غرفة، مطبخ..)</button>}
              </div>
            ) : (
              data.works.map((space: any, index: number) => (
                <div key={space.id} className="bg-[#0c0c0c] rounded-xl border border-gray-800 overflow-hidden shadow-sm">
                  <div className="bg-[#111] border-b border-gray-800 p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 flex items-center gap-2">
                      <button onClick={() => toggleExpand(space.id)} className="p-1.5 text-gray-400 hover:text-white bg-[#050505] rounded-md border border-gray-800">
                        {space.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <span className="font-bold text-[#a871f7] text-sm ml-1">{index + 1}.</span>
                      <input disabled={dis} type="text" placeholder="اسم المساحة (مثال: غرفة النوم 1)" value={space.name} onChange={(e) => updateWorkSpace(space.id, null, 'name', e.target.value)} className="w-full md:w-1/2 text-sm font-bold bg-[#050505] border border-gray-800 rounded px-3 py-1.5 focus:border-[#43bba1] text-white outline-none" />
                    </div>
                    {isEditable && <button onClick={() => removeWorkSpace(space.id)} className="text-red-500 hover:bg-[#3a1515] p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                  </div>

                  <div className={`${space.isExpanded ? 'block' : 'hidden'} p-5 space-y-6`}>
                    <div className="bg-[#1a0f2e]/30 p-4 rounded-lg border border-[#3c1d5d]">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                        <label className="text-xs font-bold text-[#a871f7] flex items-center gap-2"><ImageIcon className="w-4 h-4" /> صور المساحة (لامحدود)</label>
                        {isEditable && (
                          <label className="cursor-pointer bg-[#050505] border border-gray-700 text-gray-300 px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2">
                            <Plus className="w-3 h-3" /> إرفاق صور <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(space.id, e)} />
                          </label>
                        )}
                      </div>
                      {(space.images || []).length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                          {space.images.map((imgObj: any, i: number) => (
                            <div key={i} className="relative flex-shrink-0 group">
                              <img src={imgObj.previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-gray-700 shadow-sm" />
                              {isEditable && <button onClick={() => removeImage(space.id, i)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#43bba1] mb-3 border-b border-gray-800 pb-2">الأعمال المدنية والتشطيبات</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        <DarkInput disabled={dis} label="خرسانة" value={space.civil.concrete} onChange={(e: any) => updateWorkSpace(space.id, 'civil', 'concrete', e.target.value)} />
                        <DarkInput disabled={dis} label="أسقف" value={space.civil.roof} onChange={(e: any) => updateWorkSpace(space.id, 'civil', 'roof', e.target.value)} />
                        <DarkInput disabled={dis} label="عزل" value={space.civil.insulation} onChange={(e: any) => updateWorkSpace(space.id, 'civil', 'insulation', e.target.value)} />
                        <DarkInput disabled={dis} label="سيراميك" value={space.civil.ceramic} onChange={(e: any) => updateWorkSpace(space.id, 'civil', 'ceramic', e.target.value)} />
                        <DarkInput disabled={dis} label="دهانات" value={space.civil.paint} onChange={(e: any) => updateWorkSpace(space.id, 'civil', 'paint', e.target.value)} />
                        <DarkInput disabled={dis} label="مساح" value={space.civil.plaster} onChange={(e: any) => updateWorkSpace(space.id, 'civil', 'plaster', e.target.value)} />
                        <DarkInput disabled={dis} label="نجارة (أبواب)" value={space.civil.wood} onChange={(e: any) => updateWorkSpace(space.id, 'civil', 'wood', e.target.value)} />
                        <DarkInput disabled={dis} label="ألمنيوم (نوافذ)" value={space.civil.aluminum} onChange={(e: any) => updateWorkSpace(space.id, 'civil', 'aluminum', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
                        <h4 className="text-sm font-bold text-[#43bba1] mb-3 border-b border-gray-800 pb-2">أعمال الكهرباء</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DarkNumberCounter disabled={dis} label="لوح/بريكر" value={space.electrical.panel} onChange={(v: any) => updateWorkSpace(space.id, 'electrical', 'panel', v)} />
                          <DarkNumberCounter disabled={dis} label="مصباح مستعار" value={space.electrical.ceilingLight} onChange={(v: any) => updateWorkSpace(space.id, 'electrical', 'ceilingLight', v)} />
                          <DarkNumberCounter disabled={dis} label="سبوت لايت" value={space.electrical.spotlight} onChange={(v: any) => updateWorkSpace(space.id, 'electrical', 'spotlight', v)} />
                          <DarkNumberCounter disabled={dis} label="أفياش عادية" value={space.electrical.sockets} onChange={(v: any) => updateWorkSpace(space.id, 'electrical', 'sockets', v)} />
                        </div>
                      </div>

                      <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
                        <h4 className="text-sm font-bold text-[#43bba1] mb-3 border-b border-gray-800 pb-2">أعمال السباكة</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DarkNumberCounter disabled={dis} label="كرسي إفرنجي" value={space.plumbing.toiletFr} onChange={(v: any) => updateWorkSpace(space.id, 'plumbing', 'toiletFr', v)} />
                          <DarkNumberCounter disabled={dis} label="كرسي عربي" value={space.plumbing.toiletAr} onChange={(v: any) => updateWorkSpace(space.id, 'plumbing', 'toiletAr', v)} />
                          <DarkNumberCounter disabled={dis} label="سخانة" value={space.plumbing.heater} onChange={(v: any) => updateWorkSpace(space.id, 'plumbing', 'heater', v)} />
                          <DarkNumberCounter disabled={dis} label="مغاسل خزف" value={space.plumbing.sink} onChange={(v: any) => updateWorkSpace(space.id, 'plumbing', 'sink', v)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isEditable && data.works.length > 0 && <button onClick={addWorkSpace} className="w-full bg-[#050505] border border-dashed border-[#502b79] text-[#a871f7] py-4 rounded-xl text-sm font-bold flex justify-center items-center gap-2"><Plus className="w-5 h-5" /> إضافة مساحة إضافية لحصر الأعمال</button>}
          </div>
        </DarkCard>
      </div>

      <div className={`${currentStep === 2 ? 'block' : 'hidden'}`}>
        <DarkCard title="جرد الأثاث والأجهزة" icon={Sofa}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#050505] p-5 rounded-xl border border-gray-800">
              <h4 className="text-sm font-bold text-[#43bba1] mb-4 border-b border-gray-800 pb-2">الأثاث المطلوب</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DarkNumberCounter disabled={dis} label="سرير مفرد" value={data.furnitureItems.bed1} onChange={(v: any) => updateNestedData('furnitureItems', 'bed1', v)} />
                <DarkNumberCounter disabled={dis} label="سجاد" value={data.furnitureItems.carpet} onChange={(v: any) => updateNestedData('furnitureItems', 'carpet', v)} />
                <DarkNumberCounter disabled={dis} label="كنب (أمتار)" value={data.furnitureItems.sofaMeters} onChange={(v: any) => updateNestedData('furnitureItems', 'sofaMeters', v)} />
                <DarkNumberCounter disabled={dis} label="دولاب 4 أبواب" value={data.furnitureItems.wardrobe4} onChange={(v: any) => updateNestedData('furnitureItems', 'wardrobe4', v)} />
              </div>
            </div>
            <div className="bg-[#050505] p-5 rounded-xl border border-gray-800">
              <h4 className="text-sm font-bold text-[#43bba1] mb-4 border-b border-gray-800 pb-2">الأجهزة الكهربائية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DarkNumberCounter disabled={dis} label="مكيف سبلت" value={data.appliances.acSplit1} onChange={(v: any) => updateNestedData('appliances', 'acSplit1', v)} />
                <DarkNumberCounter disabled={dis} label="غسالة" value={data.appliances.washer} onChange={(v: any) => updateNestedData('appliances', 'washer', v)} />
                <DarkNumberCounter disabled={dis} label="ثلاجة" value={data.appliances.fridge} onChange={(v: any) => updateNestedData('appliances', 'fridge', v)} />
                <DarkNumberCounter disabled={dis} label="فرن غاز" value={data.appliances.stove} onChange={(v: any) => updateNestedData('appliances', 'stove', v)} />
              </div>
            </div>
          </div>
        </DarkCard>
      </div>

      <div className={`${currentStep === 3 ? 'block' : 'hidden'}`}>
        <DarkCard title="ملاحظات التشخيص الإضافية" icon={PenTool}>
          <DarkTextArea disabled={dis} label="ملاحظات وتوصيات استثنائية؟" rows={3} value={data.diagnosisNotes} onChange={(e: any) => setData({ ...data, diagnosisNotes: e.target.value })} />
        </DarkCard>

        {isEditable && !isCompleted ? (
          <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6">
            <div className="flex items-start gap-3 mb-4 bg-[#0a0a0a] p-4 rounded-lg border border-gray-800">
              <input type="checkbox" id="pledge_08" checked={data.pledge} onChange={(e) => setData({ ...data, pledge: e.target.checked })} className="w-5 h-5 mt-0.5 rounded accent-[#43bba1] cursor-pointer" />
              <label htmlFor="pledge_08" className="cursor-pointer">
                <h4 className="text-sm font-bold text-white mb-1">أتعهد بأن المدخلات والحصر دقيق</h4>
              </label>
            </div>
            <button onClick={submit} disabled={!data.pledge || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-md ${data.pledge ? 'bg-[#43bba1] text-black' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
              <FileSignature className="w-5 h-5" /> {busy ? 'جارٍ الرفع...' : 'اعتماد ورفع النموذج للنظام الأساسي'}
            </button>
          </div>
        ) : isCompleted ? (
          <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex justify-center"><Lock className="w-5 h-5 inline mr-2" /> تم رفع واعتماد كراسة التشخيص بنجاح</div>
        ) : null}
      </div>

      <div className="flex justify-between items-center mt-6 pt-5 border-t border-gray-800">
        <button onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} disabled={currentStep === 0} className={`text-sm font-bold ${currentStep === 0 ? 'text-gray-700' : 'text-[#a871f7]'}`}>السابق</button>
        {currentStep < steps.length - 1 && <button onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))} className="px-8 py-2.5 bg-[#1a0f2e] border border-[#3c1d5d] text-[#a871f7] rounded-lg text-sm font-bold shadow-md">التالي</button>}
      </div>
    </div>
  );
};

export default FormF08Diagnosis;
