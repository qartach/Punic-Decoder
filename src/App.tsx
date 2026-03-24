/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Languages, 
  BookOpen, 
  ArrowRight, 
  PenTool, 
  ScanText, 
  Upload, 
  Loader2, 
  CheckCircle,
  X, 
  History, 
  Image as ImageIcon, 
  ScrollText, 
  Lightbulb, 
  MapPin, 
  Search, 
  Maximize2, 
  SlidersHorizontal, 
  Volume2, 
  Download,
  Camera,
  Copy
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Map, Marker, ZoomControl } from "pigeon-maps";
import { GoogleGenAI, Modality } from "@google/genai";
import Cropper from "react-easy-crop";
import { cn } from "@/src/lib/utils";

// --- Helpers ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return "";
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL("image/jpeg");
};

const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmData.length, true);

  new Uint8Array(buffer, 44).set(pcmData);
  return new Blob([buffer], { type: "audio/wav" });
};

// --- Types & Constants ---
type Language = "ar" | "fr" | "en";

const labels = {
  ar: {
    title: "تعلّم البونيقية العربية",
    subtitle: "اكتشف كيف أن البونيقية هي أخت اللغة العربية الفصحى — لغة عربية قديمة بامتياز",
    intro: "اللغة البونيقية التي تكلّمها أهل قرطاج هي في جوهرها لغة عربية قديمة. الأدلة اللغوية واضحة: مئات الكلمات متطابقة تماماً مع العربية الفصحى الحديثة، مما يثبت أنها أخت شقيقة للعربية.",
    tabVocabulary: "الهوية اللغوية",
    tabAlphabet: "تعلم الكتابة",
    tabDecode: "فك التشفير العميق",
    tabCIS: "مستكشف CIS",
    tabText: "فك شفرة النص",
    tabPhoto: "فك شفرة الصورة",
    clearCanvas: "إمسح الكتابة",
    typePunic: "أدخل النص البوني هنا...",
    decodeText: "فك شفرة النص",
    startOver: "ابدأ من جديد",
    cropImage: "قص الصورة",
    saveCrop: "حفظ القص",
    cancelCrop: "إلغاء",
    selectZone: "حدد منطقة النص لتحسين الدقة",
    typeHere: "اكتب بالعربية أو اللاتينية للتحويل الحرفي...",
    decodeTitle: "فك شفرة النقوش العربية القديمة (البونيقية)",
    decodeDesc: "ارفع صورة لأي نقش بوني أو فينيقي وسيقوم الذكاء الاصطناعي بفك شفرته بدقة فائقة وترجمته إلى العربية",
    uploadPhoto: "ارفع صورة",
    analyzing: "جاري التحليل المعمق وفك الشفرة...",
    originalPunic: "النص البوني الأصلي",
    discoveryDate: "تاريخ الاكتشاف",
    translateToArabic: "ترجمة للعربية",
    showOnMap: "عرض على الخريطة",
    contrast: "التباين",
    brightness: "السطوع",
    imageProcessing: "معالجة الصورة",
    mirrored: "الصورة مقلوبة (مرآة)",
    handwriting: "خط يدوي",
    accuracyNote: "تحسين الدقة: سيقوم الذكاء الاصطناعي بتحليل احتمالات متعددة للحروف المتشابهة.",
    smartEnhance: "تحسين ذكي",
    resetFilters: "إعادة ضبط",
    reDecrypt: "إعادة فك التشفير",
    altMeaning: "معنى خفي آخر",
    listenArabic: "استمع بالصوت العربي",
    downloadAudio: "تحميل الصوت",
    processing: "جاري المعالجة...",
    dialectNoteTitle: "ملاحظة حول الهوية العربية",
    dialectNoteDesc: "البونيقية والعربية المعيارية الحديثة هما وجهان لعملة واحدة. الاختلافات البسيطة هي مجرد تنوع لهجوي طبيعي.",
    identical: "متطابق 100%",
    cisTitle: "مستكشف النقوش العربية القديمة (CIS)",
    cisDesc: "تصفح مجموعة Corpus Inscriptionum Arabicum واكتشف مواقع اكتشافها وترجمتها العربية.",
  },
  en: {
    title: "Learn Old Arabian Punic",
    subtitle: "Discover how Punic is a sister language to Standard Arabic",
    intro: "The Punic language spoken by Carthaginians is essentially an ancient form of Arabic.",
    tabVocabulary: "Linguistic Identity",
    tabAlphabet: "Learn Writing",
    tabDecode: "Deep Decoding",
    tabCIS: "CIS Explorer",
    tabText: "Decode Text",
    tabPhoto: "Decode Photo",
    clearCanvas: "Clear Writing",
    typePunic: "Enter Punic text here...",
    decodeText: "Decode Text",
    startOver: "Start Over",
    cropImage: "Crop Image",
    saveCrop: "Save Crop",
    cancelCrop: "Cancel",
    selectZone: "Select text zone to improve accuracy",
    typeHere: "Type in Arabic or Latin here...",
    decodeTitle: "AI Punic Inscription Decoder",
    decodeDesc: "Upload a photo of any Punic inscription and AI will decipher it and translate it to Arabic",
    uploadPhoto: "Upload Photo",
    analyzing: "Deep analysis in progress...",
    originalPunic: "Original Punic Text",
    discoveryDate: "Discovery Date",
    translateToArabic: "Translate to Arabic",
    showOnMap: "Show on Map",
    contrast: "Contrast",
    brightness: "Brightness",
    imageProcessing: "Image Processing",
    mirrored: "Mirrored Image",
    handwriting: "Handwriting",
    accuracyNote: "Accuracy Boost: AI will analyze multiple possibilities for similar letters.",
    smartEnhance: "Smart Enhance",
    resetFilters: "Reset Filters",
    reDecrypt: "Re-Decrypt",
    altMeaning: "Discover Hidden Meaning",
    listenArabic: "Listen in Arabic",
    downloadAudio: "Download Audio",
    processing: "Processing...",
    dialectNoteTitle: "Note on Arabian Identity",
    dialectNoteDesc: "Punic and Arabic are two sides of the same coin.",
    identical: "100% Identical",
    cisTitle: "CIS Explorer",
    cisDesc: "Browse the Corpus Inscriptionum Arabicum and discover discovery locations.",
  },
  fr: {
    title: "Apprendre le Punique Arabe",
    subtitle: "Découvrez comment le punique est une langue sœur de l'arabe",
    intro: "La langue punique parlée par les Carthaginois est essentiellement une forme ancienne d'arabe.",
    tabVocabulary: "Identité Linguistique",
    tabAlphabet: "Apprendre l'écriture",
    tabDecode: "Décodage Profond",
    tabCIS: "Explorateur CIS",
    tabText: "Décoder Texte",
    tabPhoto: "Décoder Photo",
    clearCanvas: "Effacer",
    typePunic: "Entrez le texte punique ici...",
    decodeText: "Décoder Texte",
    startOver: "Recommencer",
    cropImage: "Recadrer",
    saveCrop: "Enregistrer",
    cancelCrop: "Annuler",
    selectZone: "Sélectionnez la zone de texte",
    typeHere: "Tapez en arabe ou en latin ici...",
    decodeTitle: "Décodeur d'Inscriptions Puniques IA",
    decodeDesc: "Téléchargez une photo de toute inscription punique et l'IA la déchiffrera",
    uploadPhoto: "Télécharger Photo",
    analyzing: "Analyse experte en cours...",
    originalPunic: "Texte Punique Original",
    discoveryDate: "Date de Découverte",
    translateToArabic: "Traduire en Arabe",
    showOnMap: "Afficher sur la Carte",
    contrast: "Contraste",
    brightness: "Luminosité",
    imageProcessing: "Traitement d'Image",
    mirrored: "Image Miroir",
    handwriting: "Manuscrit",
    accuracyNote: "Boost de précision: l'IA analysera plusieurs possibilités.",
    smartEnhance: "Amélioration Intelligente",
    resetFilters: "Réinitialiser",
    reDecrypt: "Ré-Décoder",
    altMeaning: "Sens Caché",
    listenArabic: "Écouter en Arabe",
    downloadAudio: "Télécharger l'Audio",
    processing: "Traitement...",
    dialectNoteTitle: "Note sur l'identité arabe",
    dialectNoteDesc: "Le punique et l'arabe sont les deux faces d'une même pièce.",
    identical: "100% Identique",
    cisTitle: "Explorateur CIS",
    cisDesc: "Parcourez le Corpus Inscriptionum Arabicum.",
  }
};

const punicAlphabet = [
  { punic: "𐤀", ar: "أ", latin: "A", name: "ألف - Aleph" },
  { punic: "𐤁", ar: "ب", latin: "B", name: "بيت - Beth" },
  { punic: "𐤂", ar: "ج", latin: "G", name: "جيم - Gimel" },
  { punic: "𐤃", ar: "د", latin: "D", name: "دال - Daleth" },
  { punic: "𐤄", ar: "هـ", latin: "H", name: "هاء - He" },
  { punic: "𐤅", ar: "و", latin: "W", name: "واو - Waw" },
  { punic: "𐤆", ar: "ز", latin: "Z", name: "زاي - Zayin" },
  { punic: "𐤇", ar: "ح", latin: "H", name: "حاء - Heth" },
  { punic: "𐤈", ar: "ط", latin: "T", name: "طاء - Teth" },
  { punic: "𐤉", ar: "ي", latin: "Y", name: "ياء - Yodh" },
  { punic: "𐤊", ar: "ك", latin: "K", name: "كاف - Kaph" },
  { punic: "𐤋", ar: "ل", latin: "L", name: "لام - Lamedh" },
  { punic: "𐤌", ar: "م", latin: "M", name: "ميم - Mem" },
  { punic: "𐤍", ar: "ن", latin: "N", name: "نون - Nun" },
  { punic: "𐤎", ar: "س", latin: "S", name: "سين - Samekh" },
  { punic: "𐤏", ar: "ع", latin: "O", name: "عين - Ayin" },
  { punic: "𐤐", ar: "ف", latin: "P", name: "فاء - Pe" },
  { punic: "𐤑", ar: "ص", latin: "S", name: "صاد - Sade" },
  { punic: "𐤒", ar: "ق", latin: "Q", name: "قاف - Qoph" },
  { punic: "𐤓", ar: "ر", latin: "R", name: "راء - Resh" },
  { punic: "𐤔", ar: "ش", latin: "Sh", name: "شين - Shin" },
  { punic: "𐤕", ar: "ت", latin: "T", name: "تاء - Taw" },
];

const vocabulary = [
  { punic: "𐤀𐤁", ar: "أب", en: "Father", category: "family", similarity: 100 },
  { punic: "𐤀𐤌", ar: "أم", en: "Mother", category: "family", similarity: 100 },
  { punic: "𐤁𐤍", ar: "ابن", en: "Son", category: "family", similarity: 100 },
  { punic: "𐤁𐤕", ar: "بنت", en: "Daughter", category: "family", similarity: 100 },
  { punic: "𐤀𐤇", ar: "أخ", en: "Brother", category: "family", similarity: 100 },
  { punic: "𐤌𐤋𐤊", ar: "ملك", en: "King", category: "city", similarity: 100 },
  { punic: "𐤒𐤓𐤕", ar: "قرية / مدينة", en: "City / Village", category: "city", similarity: 90 },
  { punic: "𐤔𐤌𐤔", ar: "شمس", en: "Sun", category: "nature", similarity: 100 },
  { punic: "𐤉𐤌", ar: "يم / بحر", en: "Sea", category: "nature", similarity: 100 },
  { punic: "𐤀𐤓𐤅", ar: "أرض", en: "Earth", category: "nature", similarity: 100 },
  { punic: "𐤔𐤌𐤌", ar: "سماء", en: "Sky / Heavens", category: "nature", similarity: 80 },
  { punic: "𐤁𐤏𐤋", ar: "بعل / رب", en: "Lord / Master", category: "religion", similarity: 100 },
  { punic: "𐤔𐤋𐤌", ar: "سلام", en: "Peace", category: "daily", similarity: 100 },
  { punic: "𐤋𐤇𐤌", ar: "لحم / خبز", en: "Meat / Bread", category: "agriculture", similarity: 70 },
  { punic: "𐤔𐤍𐤕", ar: "سنة", en: "Year", category: "time", similarity: 90 },
];

const cisInscriptions = [
  {
    id: "CIS I 166",
    title: "Carthage Festival Inscription",
    location: "Carthage, Tunisia",
    coords: [36.8529, 10.3234] as [number, number],
    description: {
      ar: "نقش مهرجان قرطاج (CIS I 166). يمثل قانوناً طقسياً يحدد القرابين والاحتفالات. يذكر 'الحرير البحري' و 'مائتي فتى'.",
      fr: "Inscription du Festival de Carthage (CIS I 166). Un protocole sacré détaillant les offrandes et les rituels.",
      en: "The Carthage Festival Inscription (CIS I 166). A sacred protocol detailing offerings and rituals, mentioning 'Byssus' and 'Two Hundred Boys'.",
    },
    text: "𐤉𐤌 𐤄𐤀𐤓𐤁𐤏𐤉 𐤔𐤄 𐤐𐤓 𐤉𐤀 𐤄𐤒𐤃𐤔 𐤄𐤒𐤃𐤔 𐤁𐤇𐤃𐤓𐤕 𐤅𐤋𐤇𐤌 𐤒𐤈𐤓𐤕",
    discoveryDate: "1860",
    image: "https://picsum.photos/seed/festival/800/600",
  },
  {
    id: "CIS I 1",
    title: "The Nora Stone",
    location: "Nora, Sardinia",
    coords: [38.9847, 9.0158] as [number, number],
    description: {
      ar: "من أقدم النقوش العربية القديمة في الغرب، يعود للقرن التاسع قبل الميلاد. يذكر انتصاراً عسكرياً وتأسيس معبد.",
      fr: "L'une des plus anciennes inscriptions phéniciennes en Occident, datant du IXe siècle av. J.-C.",
      en: "One of the oldest Phoenician inscriptions in the West, dating to the 9th century BC.",
    },
    text: "𐤋𐤕𐤓𐤔𐤔 𐤅𐤂𐤓𐤔 𐤄𐤀 𐤁𐤔𐤓𐤃𐤍 𐤔𐤋𐤌 𐤄𐤀 𐤔𐤋𐤌 𐤑𐤁𐤀 𐤌𐤋𐤊𐤕𐤍 𐤁𐤍 𐤔𐤁𐤍 𐤍𐤂𐤃 𐤋𐤐𐤌𐤉",
    discoveryDate: "1773",
    image: "https://picsum.photos/seed/nora/800/600",
  },
  {
    id: "CIS I 165",
    title: "Marseille Tariff",
    location: "Marseille, France (Origin: Carthage)",
    coords: [43.2965, 5.3698] as [number, number],
    description: {
      ar: "لوحة من الرخام تصف تكاليف القرابين في معبد بعل صفون. تعطي لمحة فريدة عن الاقتصاد الديني القرطاجي.",
      fr: "Tarif sacrificiel de Marseille, provenant de Carthage. Détaille les taxes pour les sacrifices.",
      en: "The Marseille Tariff, originally from Carthage. Details the costs of sacrifices at the temple of Baal Saphon.",
    },
    text: "𐤁𐤕 𐤁𐤏𐤋 𐤑𐤐𐤍 𐤌𐤔𐤀𐤕 𐤄𐤊𐤄𐤍𐤌 𐤁𐤔𐤋𐤌 𐤅𐤁𐤊𐤋𐤉𐤋",
    discoveryDate: "1844",
    image: "https://picsum.photos/seed/marseille/800/600",
  },
  {
    id: "CIS I 149",
    title: "Carthage Votive Stela",
    location: "Carthage, Tunisia",
    coords: [36.8529, 10.3234] as [number, number],
    description: {
      ar: "نصب نذري مخصص للإلهة تنيت وجه بعل وللإله بعل حمون. يظهر الرمز الشهير لتنيت.",
      fr: "Stèle votive dédiée à Tanit et Baal Hammon, avec le signe de Tanit.",
      en: "Votive stela dedicated to Tanit Face of Baal and Baal Hammon. Features the Sign of Tanit.",
    },
    text: "𐤋𐤓𐤁𐤕 𐤋𐤕𐤍𐤕 𐤐𐤍 𐤁𐤏𐤋 𐤅𐤋𐤀𐤃𐤍 𐤋𐤁𐤏𐤋 𐤇𐤌𐤍",
    discoveryDate: "1921",
    image: "https://picsum.photos/seed/carthage/800/600",
  },
  {
    id: "CIS I 171",
    title: "Carthage Boundary Stone",
    location: "Carthage, Tunisia",
    coords: [36.85, 10.33] as [number, number],
    description: {
      ar: "حجر حدودي يحدد ملكية الأرض أو منطقة مقدسة في قرطاج.",
      fr: "Borne délimitant une propriété ou une zone sacrée à Carthage.",
      en: "Boundary stone defining property or a sacred area in Carthage.",
    },
    text: "𐤌𐤔𐤐𐤈 𐤄𐤔𐤐𐤈𐤌 𐤔𐤋 𐤒𐤓𐤕 𐤇𐤃𐤔𐤕",
    discoveryDate: "1890",
    image: "https://picsum.photos/seed/boundary/800/600",
  },
  {
    id: "CIS I 3",
    title: "Kition Stela",
    location: "Kition, Cyprus",
    coords: [34.92, 33.62] as [number, number],
    description: {
      ar: "نصب من كيتيون في قبرص، يظهر الروابط القوية بين الفينيقيين في الشرق والغرب.",
      fr: "Stèle de Kition à Chypre, montrant les liens entre Phéniciens d'Orient et d'Occident.",
      en: "Stela from Kition, Cyprus, showing the strong links between Eastern and Western Phoenicians.",
    },
    text: "𐤋𐤁𐤏𐤋 𐤋𐤁𐤍 𐤏𐤁𐤃 𐤌𐤋𐤒𐤓𐤕",
    discoveryDate: "1881",
    image: "https://picsum.photos/seed/kition/800/600",
  },
];

// --- Components ---
const AlphabetBoard = ({ selectedLetter, l }: { selectedLetter: any; l: any }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    const pos = getPos(e, canvas);
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#b58e30";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="relative w-full aspect-square bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden shadow-inner touch-none">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 select-none">
          <span className="text-[200px] font-sans text-slate-900">{selectedLetter.punic}</span>
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full cursor-crosshair relative z-10"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <button 
        className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        onClick={clearCanvas}
      >
        <PenTool className="w-4 h-4" /> {l.clearCanvas}
      </button>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [language, setLanguage] = useState<Language>("ar");
  const isRTL = language === "ar";
  const l = labels[language];

  const [activeTab, setActiveTab] = useState<"vocabulary" | "alphabet" | "decode" | "cis">("vocabulary");
  const [decodeMode, setDecodeMode] = useState<"photo" | "text">("photo");
  const [punicTextInput, setPunicTextInput] = useState("");
  const [selectedLetter, setSelectedLetter] = useState(punicAlphabet[0]);
  const [vocabSearch, setVocabSearch] = useState("");
  const [vocabCategory, setVocabCategory] = useState<string>("all");

  // Decoder State
  const [decodeImage, setDecodeImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<{ data: string; mimeType: string } | null>(null);
  const [decodeLoading, setDecodeLoading] = useState(false);
  const [decodeResult, setDecodeResult] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [readingText, setReadingText] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  // Persistence: Load from localStorage
  useEffect(() => {
    const savedDecodeResult = localStorage.getItem("punic_decode_result");
    const savedPunicText = localStorage.getItem("punic_text_input");
    const savedDecodeMode = localStorage.getItem("punic_decode_mode");
    const savedDecodeImage = localStorage.getItem("punic_decode_image");

    if (savedDecodeResult) setDecodeResult(savedDecodeResult);
    if (savedPunicText) setPunicTextInput(savedPunicText);
    if (savedDecodeMode) setDecodeMode(savedDecodeMode as any);
    if (savedDecodeImage) {
      setDecodeImage(savedDecodeImage);
      const mimeType = savedDecodeImage.match(/data:([^;]+);/)?.[1] || "image/jpeg";
      const base64Data = savedDecodeImage.split(",")[1];
      if (base64Data) {
        setImageFile({ data: base64Data, mimeType });
      }
    }
  }, []);

  // Persistence: Save to localStorage
  useEffect(() => {
    if (decodeResult) localStorage.setItem("punic_decode_result", decodeResult);
    else localStorage.removeItem("punic_decode_result");
  }, [decodeResult]);

  useEffect(() => {
    localStorage.setItem("punic_text_input", punicTextInput);
  }, [punicTextInput]);

  useEffect(() => {
    localStorage.setItem("punic_decode_mode", decodeMode);
  }, [decodeMode]);

  useEffect(() => {
    if (decodeImage) localStorage.setItem("punic_decode_image", decodeImage);
    else localStorage.removeItem("punic_decode_image");
  }, [decodeImage]);

  // Cropping State
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // CIS State
  const [selectedCis, setSelectedCis] = useState(cisInscriptions[0]);
  const [cisSearch, setCisSearch] = useState("");

  // Image Filters
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [isMirrored, setIsMirrored] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(language === "ar" ? "يرجى اختيار ملف صورة" : "Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(",")[1];
      setDecodeImage(result);
      setImageFile({ data: base64Data, mimeType: file.type });
      setDecodeResult(null);
      setAudioUrl(null);
      setIsCropping(true); // Automatically enter cropping mode on upload
    };
    reader.readAsDataURL(file);
  }, [language]);

  const onCropComplete = useCallback((_croppedArea: any, pixelCrop: any) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  const handleSaveCrop = async () => {
    if (!decodeImage || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(decodeImage, croppedAreaPixels);
      setDecodeImage(croppedImage);
      const base64Data = croppedImage.split(",")[1];
      setImageFile({ data: base64Data, mimeType: "image/jpeg" });
      setIsCropping(false);
      toast.success(language === "ar" ? "تم قص الصورة بنجاح" : "Image cropped successfully");
    } catch (e) {
      console.error(e);
      toast.error(language === "ar" ? "فشل قص الصورة" : "Failed to crop image");
    }
  };

  const handleStartOver = () => {
    setDecodeImage(null);
    setImageFile(null);
    setDecodeResult(null);
    setAudioUrl(null);
    setPunicTextInput("");
    setIsCropping(false);
  };

  const handleDecrypt = async () => {
    if (decodeMode === "photo" && !imageFile) return;
    if (decodeMode === "text" && !punicTextInput.trim()) return;

    setDecodeLoading(true);
    setDecodeResult(null);
    setAudioUrl(null);
    setReadingText("");
    setReadingProgress(0);
    setCurrentWordIndex(-1);

    try {
      const parts: any[] = [];
      if (decodeMode === "photo" && imageFile) {
        parts.push({
          inlineData: {
            data: imageFile.data,
            mimeType: imageFile.mimeType,
          },
        });
      }

      const promptText = decodeMode === "photo" 
        ? `Analyze this Punic or Phoenician inscription. 
              1. Transcribe the original Punic text (line by line if applicable).
              2. Provide a complete Arabic transliteration (النقحرة العربية). First, show the breakdown per line, then COLLECT all words into a single phonetic Arabic string for reading. 
              3. Use the EXACT format "تُقرأ: [collected_phonetic_text]" for the final combined reading.
              4. Provide a full Arabic translation (الترجمة العربية).
              5. Explain the historical context.
              Output in Markdown format. The "تُقرأ:" line MUST contain the full phonetic reading of the entire inscription in Arabic letters (e.g., if the lines are "MFOL" and "AGDR", write "تُقرأ: مفعل أجدر").`
        : `Analyze this Punic or Phoenician text: "${punicTextInput}". 
              1. Transcribe the Punic text.
              2. Provide a complete Arabic transliteration (النقحرة العربية). COLLECT all words into a single phonetic Arabic string for reading. 
              3. Use the EXACT format "تُقرأ: [collected_phonetic_text]" for the final combined reading.
              4. Provide a full Arabic translation (الترجمة العربية).
              5. Explain the linguistic roots and historical context.
              Output in Markdown format. The "تُقرأ:" line MUST contain the full phonetic reading of the entire text in Arabic letters.`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts },
        config: {
          systemInstruction: "You are an expert epigraphist specializing in Punic and Phoenician Arabic languages. You provide 100% accurate decodings, phonetic transliterations to Arabic, and translations. If you mention Hebrew, refer to it as an Arabic dialect or part of the Arabic language family.",
        }
      });
      setDecodeResult(response.text || "No result found.");
    } catch (err: any) {
      console.error("Decode error:", err);
      toast.error(l.decodeTitle + " Error");
    } finally {
      setDecodeLoading(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!decodeResult) return;
    setIsProcessingAudio(true);
    try {
      // Extract the specific "تُقرأ:" line which should contain the collected phonetic text
      const tuqraMatch = decodeResult.match(/تُقرأ:\s*([^\n]+)/);
      
      let textToRead = "";
      if (tuqraMatch) {
        textToRead = tuqraMatch[0].trim(); // Includes "تُقرأ:"
      } else {
        // Fallback: Try to find the transliteration section and clean it up
        const translitMatch = decodeResult.match(/(?:النقحرة العربية|Arabic Transliteration):?\s*([\s\S]*?)(?=\n\d\.|\n[#*]|\n\n|$)/i);
        if (translitMatch) {
          const content = translitMatch[1].trim();
          // Remove parenthetical breakdowns like (م - ف - ع - ل) to get just the words
          const cleaned = content.replace(/\([^)]+\)/g, '').replace(/السطر [^:]+:/g, '').replace(/\s+/g, ' ').trim();
          textToRead = `تُقرأ: ${cleaned}`;
        }
      }

      // Final Fallback: If no transliteration found at all, use the translation
      if (!textToRead) {
        const lines = decodeResult.split("\n");
        for (const line of lines) {
          if (line.includes("الترجمة العربية") || line.includes("Arabic Translation")) {
            textToRead = line.split(":")[1]?.trim() || line;
            break;
          }
        }
      }

      if (!textToRead) textToRead = decodeResult.substring(0, 200);

      setReadingText(textToRead.replace(/^تُقرأ:\s*/, ''));

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToRead }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const pcmData = Uint8Array.from(atob(base64Audio), (c) => c.charCodeAt(0));
        const audioBlob = addWavHeader(pcmData, 24000);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      }
    } catch (err: any) {
      console.error("TTS Error:", err);
      toast.error("Audio generation failed");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === "ar" ? "تم النسخ إلى الحافظة" : "Copied to clipboard");
  };

  return (
    <div className={cn("min-h-screen bg-white text-slate-900 font-sans", isRTL ? "rtl" : "ltr")} dir={isRTL ? "rtl" : "ltr"}>
      <Toaster position="top-center" />
      
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 font-bold text-xl shadow-lg shadow-slate-200">Q</div>
            <span className="text-2xl font-bold tracking-tight font-heading">Qartach</span>
          </div>
          <div className="flex items-center gap-4">
            <select 
              className="bg-slate-100 border-none rounded-lg px-3 py-1 text-sm font-medium"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-20 relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-700 text-[10px] font-bold uppercase tracking-[0.2em]">
                <ScrollText size={14} /> {language === "ar" ? "الهوية اللغوية القرطاجية" : "Carthaginian Linguistic Identity"}
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 font-heading leading-[1.1]">
                {l.title} <span className="text-amber-500">.</span>
              </h1>
              <p className="text-2xl text-slate-500 leading-relaxed max-w-2xl mx-auto font-serif italic">
                {l.subtitle}
              </p>
            </motion.div>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-20">
            <div className="bg-slate-50 p-2 rounded-[32px] flex gap-2 border border-slate-100 shadow-inner">
              {[
                { id: "vocabulary", icon: BookOpen, label: l.tabVocabulary },
                { id: "alphabet", icon: PenTool, label: l.tabAlphabet },
                { id: "decode", icon: ScanText, label: l.tabDecode },
                { id: "cis", icon: History, label: l.tabCIS },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-3",
                    activeTab === tab.id 
                      ? "bg-slate-900 text-white shadow-2xl shadow-slate-200 scale-105" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  )}
                >
                  <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-amber-500" : "")} /> 
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "vocabulary" && (
              <motion.div 
                key="vocab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-12"
              >
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {vocabulary
                    .filter(item => 
                      (vocabCategory === "all" || item.category === vocabCategory) &&
                      (item.ar.includes(vocabSearch) || item.en.toLowerCase().includes(vocabSearch.toLowerCase()))
                    )
                    .map((item, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                      <div className="flex justify-between items-start mb-8 relative">
                        <span className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-600 border border-slate-100">{item.category}</span>
                        <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[10px] bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                          <CheckCircle size={12} /> {item.similarity}% {l.identical}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-8 relative">
                        <div className="text-7xl font-sans text-slate-900 group-hover:scale-110 transition-transform duration-500">{item.punic}</div>
                        <div className="w-12 h-[1px] bg-amber-200" />
                        <div className="text-center space-y-2">
                          <div className="text-3xl font-bold font-heading text-slate-900">{item.ar}</div>
                          <div className="text-slate-600 font-medium tracking-wide uppercase text-[10px]">{language === 'en' ? item.en : item.ar}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "alphabet" && (
              <motion.div 
                key="alphabet"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid lg:grid-cols-12 gap-12"
              >
                <div className="lg:col-span-4 space-y-4 max-h-[800px] overflow-y-auto pr-4 custom-scrollbar">
                  {punicAlphabet.map((letter) => (
                    <button
                      key={letter.punic}
                      onClick={() => setSelectedLetter(letter)}
                      className={cn(
                        "w-full p-8 rounded-[32px] border transition-all flex items-center justify-between group",
                        selectedLetter.punic === letter.punic 
                          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]" 
                          : "bg-white border-slate-100 text-slate-900 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-sans transition-colors",
                          selectedLetter.punic === letter.punic ? "bg-amber-500 text-slate-900" : "bg-slate-50 text-slate-900 group-hover:bg-slate-100"
                        )}>
                          {letter.punic}
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">{letter.latin}</div>
                          <div className="text-xl font-bold font-heading">{letter.name}</div>
                        </div>
                      </div>
                      <ArrowRight size={20} className={cn("transition-transform", selectedLetter.punic === letter.punic ? "translate-x-1 text-amber-500" : "text-slate-400 group-hover:translate-x-1")} />
                    </button>
                  ))}
                </div>
                <div className="lg:col-span-8">
                  <div className="bg-white rounded-[48px] border border-slate-100 p-12 shadow-sm sticky top-32">
                    <AlphabetBoard selectedLetter={selectedLetter} l={l} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "decode" && (
              <motion.div 
                key="decode"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid lg:grid-cols-12 gap-12"
              >
                <div className="lg:col-span-5 space-y-8">
                  {/* Mode Toggle */}
                  <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button 
                      className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", decodeMode === "photo" ? "bg-white shadow-sm" : "text-slate-600")}
                      onClick={() => setDecodeMode("photo")}
                    >
                      {l.tabPhoto}
                    </button>
                    <button 
                      className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", decodeMode === "text" ? "bg-white shadow-sm" : "text-slate-600")}
                      onClick={() => setDecodeMode("text")}
                    >
                      {l.tabText}
                    </button>
                  </div>

                  {decodeMode === "photo" ? (
                    <div className="space-y-8">
                      <div 
                        className="aspect-square bg-white border-2 border-dashed border-slate-300 rounded-[40px] flex flex-col items-center justify-center p-10 text-center cursor-pointer hover:border-slate-900 transition-colors relative overflow-hidden group"
                        onClick={() => !isCropping && fileInputRef.current?.click()}
                      >
                        {decodeImage ? (
                          isCropping ? (
                            <div className="absolute inset-0 z-50 bg-slate-900">
                              <Cropper
                                image={decodeImage}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                              />
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-[60]">
                                <button className="px-4 py-2 bg-white text-slate-900 rounded-lg font-bold text-xs" onClick={(e) => { e.stopPropagation(); handleSaveCrop(); }}>{l.saveCrop}</button>
                                <button className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-xs" onClick={(e) => { e.stopPropagation(); setIsCropping(false); }}>{l.cancelCrop}</button>
                              </div>
                            </div>
                          ) : (
                            <img 
                              src={decodeImage} 
                              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" 
                              style={{ filter: `contrast(${contrast}%) brightness(${brightness}%) ${isMirrored ? 'scaleX(-1)' : ''}` }}
                            />
                          )
                        ) : (
                          <>
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 text-slate-400">
                              <Upload size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{l.uploadPhoto}</h3>
                            <p className="text-slate-500">{l.decodeDesc}</p>
                          </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                      </div>

                      {decodeImage && !isCropping && (
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold flex items-center gap-2"><SlidersHorizontal size={18} /> {l.imageProcessing}</h4>
                            <div className="flex gap-2">
                              <button className="text-xs font-bold text-slate-400 hover:text-slate-900" onClick={() => setIsCropping(true)}>{l.cropImage}</button>
                              <button className="text-xs font-bold text-slate-400 hover:text-slate-900" onClick={() => { setContrast(100); setBrightness(100); setIsMirrored(false); }}>{l.resetFilters}</button>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs font-bold"><span>{l.contrast}</span><span>{contrast}%</span></div>
                              <input type="range" min="50" max="200" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="w-full accent-slate-900" />
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs font-bold"><span>{l.brightness}</span><span>{brightness}%</span></div>
                              <input type="range" min="50" max="200" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="w-full accent-slate-900" />
                            </div>
                            <button 
                              className={cn("w-full py-3 rounded-xl text-sm font-bold border transition-all", isMirrored ? "bg-slate-900 text-white" : "border-slate-200 hover:border-slate-900")}
                              onClick={() => setIsMirrored(!isMirrored)}
                            >
                              {l.mirrored}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                        <textarea 
                          className="w-full h-64 p-4 bg-slate-50 border-none rounded-2xl outline-none font-sans text-2xl resize-none"
                          placeholder={l.typePunic}
                          value={punicTextInput}
                          onChange={(e) => setPunicTextInput(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {punicAlphabet.map((letter, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPunicTextInput(prev => prev + letter.punic)}
                            className="aspect-square bg-white border border-slate-200 rounded-xl flex items-center justify-center text-xl hover:bg-slate-50 transition-colors"
                          >
                            {letter.punic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button 
                      className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-bold text-lg shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                      onClick={handleDecrypt}
                      disabled={decodeLoading || (decodeMode === "photo" ? !imageFile : !punicTextInput.trim())}
                    >
                      {decodeLoading ? <Loader2 className="animate-spin" /> : <ScanText />}
                      {decodeMode === "photo" ? l.tabDecode : l.decodeText}
                    </button>
                    {(decodeImage || punicTextInput || decodeResult) && (
                      <button 
                        className="px-6 py-5 bg-white border border-slate-200 text-slate-900 rounded-3xl font-bold hover:bg-slate-50 transition-colors"
                        onClick={handleStartOver}
                      >
                        <X size={24} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="bg-white rounded-[48px] border border-slate-100 p-12 shadow-sm min-h-[600px] relative overflow-hidden parchment">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    {decodeResult ? (
                      <div className="space-y-10 relative">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600">
                              <ScrollText size={24} />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold font-heading text-slate-900">{l.originalPunic}</h3>
                              <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">{l.analyzing}</p>
                            </div>
                          </div>
                          <button 
                            onClick={handleStartOver}
                            className="px-6 py-3 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            {l.startOver}
                          </button>
                        </div>

                        <div className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:text-slate-900 prose-p:text-2xl prose-p:font-serif prose-p:leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>
                          <div className="bg-white/50 backdrop-blur-sm p-10 rounded-[32px] border border-slate-100 shadow-sm">
                            <ReactMarkdown>{decodeResult}</ReactMarkdown>
                          </div>
                        </div>

                        <div className="flex flex-col gap-6 pt-10 border-t border-slate-100">
                          {!audioUrl && !isProcessingAudio && (
                            <button 
                              onClick={handleGenerateAudio}
                              className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-bold text-lg flex items-center justify-center gap-4 hover:bg-slate-800 hover:scale-[1.02] transition-all shadow-2xl shadow-slate-200"
                            >
                              <Volume2 size={24} className="text-amber-500" /> {l.listenArabic}
                            </button>
                          )}

                          {isProcessingAudio && (
                            <div className="w-full py-6 bg-slate-100 text-slate-600 rounded-[32px] font-bold text-lg flex items-center justify-center gap-4 animate-pulse border border-slate-200">
                              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" /> {l.processing}
                            </div>
                          )}

                          {audioUrl && (
                            <div className="space-y-6">
                              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
                                <audio 
                                  src={audioUrl} 
                                  controls 
                                  className="flex-1 h-12"
                                  onTimeUpdate={(e) => {
                                    const audio = e.currentTarget;
                                    const progress = (audio.currentTime / audio.duration) * 100;
                                    setReadingProgress(progress);
                                    
                                    // TikTok style word highlighting
                                    const words = readingText.split(/\s+/);
                                    if (words.length > 0) {
                                      const index = Math.floor((audio.currentTime / audio.duration) * words.length);
                                      setCurrentWordIndex(index);
                                    }
                                  }}
                                  onPlay={() => setIsPlayingAudio(true)}
                                  onPause={() => setIsPlayingAudio(false)}
                                  onEnded={() => {
                                    setIsPlayingAudio(false);
                                    setReadingProgress(0);
                                    setCurrentWordIndex(-1);
                                  }}
                                />
                                <a href={audioUrl} download="translation.wav" className="p-3 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-2xl transition-all"><Download size={20} /></a>
                              </div>
                              
                              <AnimatePresence>
                                {readingText && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="p-10 bg-slate-900 text-white rounded-[40px] shadow-2xl border border-slate-800 overflow-hidden relative"
                                  >
                                    <div 
                                      className="absolute top-0 left-0 h-1.5 bg-amber-500 transition-all duration-100 ease-linear" 
                                      style={{ width: `${readingProgress}%` }} 
                                    />
                                    <div className="flex items-center gap-8">
                                      <div className={cn(
                                        "w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20",
                                        isPlayingAudio && "animate-pulse"
                                      )}>
                                        <Volume2 size={28} />
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">
                                          {isPlayingAudio ? "Now Reading" : "Audio Ready"}
                                        </div>
                                        <div className="text-3xl font-bold font-heading text-amber-500 tracking-tight leading-tight flex flex-wrap gap-x-2">
                                          {readingText.split(/\s+/).map((word, idx) => (
                                            <span 
                                              key={idx} 
                                              className={cn(
                                                "transition-all duration-200",
                                                currentWordIndex === idx ? "text-white scale-110 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" : "opacity-40"
                                              )}
                                            >
                                              {word}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-8 text-slate-500">
                        <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200"><ImageIcon size={48} /></div>
                        <p className="text-xl font-medium font-serif italic">Results will appear here after decryption.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "cis" && (
              <motion.div 
                key="cis"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-12"
              >
                <div className="grid lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                      <input 
                        className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[32px] focus:ring-4 ring-amber-500/5 outline-none font-bold text-slate-900 shadow-sm" 
                        placeholder="Search CIS..." 
                        value={cisSearch}
                        onChange={(e) => setCisSearch(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                      {cisInscriptions
                        .filter(insc => 
                          insc.id.toLowerCase().includes(cisSearch.toLowerCase()) || 
                          insc.title.toLowerCase().includes(cisSearch.toLowerCase())
                        )
                        .map((insc) => (
                        <button 
                          key={insc.id} 
                          onClick={() => setSelectedCis(insc)}
                          className={cn(
                            "w-full text-left p-8 bg-white border rounded-[32px] transition-all space-y-3 group",
                            selectedCis.id === insc.id 
                              ? "border-slate-900 bg-slate-900 text-white shadow-2xl scale-[1.02]" 
                              : "border-slate-200 hover:border-slate-400"
                          )}
                        >
                          <div className={cn("text-[10px] font-bold uppercase tracking-widest", selectedCis.id === insc.id ? "text-amber-500" : "text-slate-500")}>{insc.id}</div>
                          <div className={cn("font-bold text-xl font-heading", selectedCis.id === insc.id ? "text-white" : "text-slate-900")}>{insc.title}</div>
                          <div className={cn("flex items-center gap-2 text-xs font-medium", selectedCis.id === insc.id ? "text-slate-400" : "text-slate-600")}>
                            <MapPin size={14} className={selectedCis.id === insc.id ? "text-amber-500" : "text-slate-400"} /> {insc.location}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="lg:col-span-8">
                    <div className="bg-white rounded-[48px] border border-slate-200 overflow-hidden shadow-sm sticky top-32">
                      <div className="h-[450px] bg-slate-100 relative">
                        <Map height={450} center={selectedCis.coords} zoom={11}>
                          {cisInscriptions.map(insc => (
                            <Marker 
                              key={insc.id} 
                              anchor={insc.coords} 
                              width={40}
                              color={selectedCis.id === insc.id ? "#f59e0b" : "#0f172a"} 
                              onClick={() => setSelectedCis(insc)}
                            />
                          ))}
                        </Map>
                      </div>
                      <div className="p-12 space-y-10 parchment relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="flex justify-between items-start relative">
                          <div className="space-y-2">
                            <span className="px-4 py-1.5 bg-amber-500/10 rounded-full text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-4 inline-block">{selectedCis.id}</span>
                            <h3 className="text-5xl font-black font-heading text-slate-900">{selectedCis.title}</h3>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">{l.discoveryDate}</div>
                            <div className="text-2xl font-black font-heading text-slate-900">{selectedCis.discoveryDate}</div>
                          </div>
                        </div>
                        <div className="p-10 bg-white rounded-[40px] border border-slate-200 text-center relative group shadow-sm">
                          <button 
                            onClick={() => copyToClipboard(selectedCis.text)}
                            className="absolute top-6 right-6 p-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                            title="Copy Punic Text"
                          >
                            <Copy size={20} />
                          </button>
                          <div className="text-7xl font-sans text-slate-900 mb-8 leading-tight">{selectedCis.text}</div>
                          <div className="w-16 h-1 bg-amber-500 mx-auto rounded-full mb-8" />
                          <div className="text-2xl font-serif italic text-slate-700 leading-relaxed max-w-2xl mx-auto">
                            {selectedCis.description[language]}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-20">
        <div className="container mx-auto px-6 text-center space-y-4">
          <div className="font-bold text-slate-900">Qartach</div>
          <p className="text-slate-400 text-sm">© 2026 — Documenting stolen heritage. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
