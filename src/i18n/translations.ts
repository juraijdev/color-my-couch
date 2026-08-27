export type Lang = "en" | "zh" | "ar" | "id";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
];

type Entry = { zh: string; ar: string; id: string };

/**
 * English UI phrase -> translations.
 * Product / material / colour names and product codes are intentionally NOT
 * translated so customers always see the real finish names.
 */
export const DICTIONARY: Record<string, Entry> = {
  // --- Header / nav ---
  "Home": { zh: "首页", ar: "الرئيسية", id: "Beranda" },
  "Transform Your Design": { zh: "改造您的设计", ar: "حوّل تصميمك", id: "Ubah Desain Anda" },
  "Admin": { zh: "管理员", ar: "المشرف", id: "Admin" },
  "AI Assistant Chat": { zh: "AI 助手聊天", ar: "محادثة مساعد الذكاء الاصطناعي", id: "Obrolan Asisten AI" },
  "Signed in as": { zh: "登录身份", ar: "تم تسجيل الدخول باسم", id: "Masuk sebagai" },
  "Sign out": { zh: "退出登录", ar: "تسجيل الخروج", id: "Keluar" },
  "User": { zh: "用户", ar: "مستخدم", id: "Pengguna" },
  "Language": { zh: "语言", ar: "اللغة", id: "Bahasa" },

  // --- Home hero ---
  "AI-Powered Furniture Customization": { zh: "AI 驱动的家具定制", ar: "تخصيص الأثاث بالذكاء الاصطناعي", id: "Kustomisasi Furnitur Bertenaga AI" },
  "Transform Your": { zh: "改造您的", ar: "حوّل", id: "Ubah" },
  "Design Vision": { zh: "设计愿景", ar: "رؤيتك التصميمية", id: "Visi Desain Anda" },
  "Design Vision.": { zh: "设计愿景。", ar: "رؤيتك التصميمية.", id: "Visi Desain Anda." },
  "Upload your furniture photo, select premium materials, and watch AI transform your piece in seconds. Professional-grade customization made effortless.":
    { zh: "上传您的家具照片，选择优质材料，几秒钟内即可看到 AI 完成改造。专业级定制，轻松实现。", ar: "ارفع صورة أثاثك، واختر الخامات الفاخرة، وشاهد الذكاء الاصطناعي يحوّل قطعتك في ثوانٍ. تخصيص احترافي بلا عناء.", id: "Unggah foto furnitur Anda, pilih material premium, dan lihat AI mengubahnya dalam hitungan detik. Kustomisasi kelas profesional tanpa repot." },
  "Start Customizing": { zh: "开始定制", ar: "ابدأ التخصيص", id: "Mulai Kustomisasi" },
  "Suggest Colors from Room": { zh: "根据房间推荐颜色", ar: "اقترح ألواناً من الغرفة", id: "Sarankan Warna dari Ruangan" },
  "Learn More": { zh: "了解更多", ar: "اعرف المزيد", id: "Pelajari Lebih Lanjut" },

  // --- How it works ---
  "How It Works": { zh: "使用流程", ar: "كيف تعمل", id: "Cara Kerja" },
  "Three Simple Steps": { zh: "三个简单步骤", ar: "ثلاث خطوات بسيطة", id: "Tiga Langkah Sederhana" },
  "Upload Your Photo": { zh: "上传您的照片", ar: "ارفع صورتك", id: "Unggah Foto Anda" },
  "Take a photo of any furniture piece — buffet tables, chairs, cabinets, or anything you want to customize.":
    { zh: "拍摄任意家具的照片——餐边柜、椅子、柜子，或任何您想定制的物品。", ar: "التقط صورة لأي قطعة أثاث — طاولات بوفيه، كراسي، خزائن، أو أي شيء تريد تخصيصه.", id: "Ambil foto furnitur apa pun — meja bufet, kursi, lemari, atau apa pun yang ingin Anda kustomisasi." },
  "Choose Materials": { zh: "选择材料", ar: "اختر الخامات", id: "Pilih Material" },
  "Browse our library of premium wood, stone, metal, and fabric patterns. Assign different materials to each furniture part.":
    { zh: "浏览我们的优质木材、石材、金属和面料图案库，为每个家具部件分配不同材料。", ar: "تصفح مكتبتنا من أنماط الخشب والحجر والمعدن والأقمشة الفاخرة. عيّن خامات مختلفة لكل جزء من الأثاث.", id: "Jelajahi pustaka pola kayu, batu, logam, dan kain premium kami. Tetapkan material berbeda untuk setiap bagian furnitur." },
  "Generate Design": { zh: "生成设计", ar: "إنشاء التصميم", id: "Buat Desain" },
  "Our AI accurately applies your chosen materials while preserving the exact shape and proportions of your furniture.":
    { zh: "我们的 AI 精准应用您选择的材料，同时完整保留家具的形状与比例。", ar: "يطبّق الذكاء الاصطناعي الخامات المختارة بدقة مع الحفاظ على شكل وأبعاد الأثاث تماماً.", id: "AI kami menerapkan material pilihan Anda secara akurat sambil mempertahankan bentuk dan proporsi furnitur." },

  // --- Features ---
  "What We Offer": { zh: "我们提供什么", ar: "ما نقدمه", id: "Yang Kami Tawarkan" },
  "Professional Furniture Visualization": { zh: "专业家具可视化", ar: "تصوّر احترافي للأثاث", id: "Visualisasi Furnitur Profesional" },
  "Our AI-powered platform enables designers, manufacturers, and retailers to visualize furniture in any material combination — without expensive photoshoots or physical samples.":
    { zh: "我们的 AI 平台让设计师、制造商和零售商无需昂贵拍摄或实物样品，即可预览任意材料组合的家具效果。", ar: "تمكّن منصتنا المدعومة بالذكاء الاصطناعي المصممين والمصنّعين وتجار التجزئة من تصوّر الأثاث بأي تركيبة خامات — دون جلسات تصوير مكلفة أو عينات فعلية.", id: "Platform bertenaga AI kami memungkinkan desainer, produsen, dan peritel memvisualisasikan furnitur dalam kombinasi material apa pun — tanpa pemotretan mahal atau sampel fisik." },
  "Intelligent Part Detection": { zh: "智能部件识别", ar: "كشف الأجزاء الذكي", id: "Deteksi Bagian Cerdas" },
  "AI automatically identifies distinct parts — surfaces, frames, edges, and trim — for precise material assignment.":
    { zh: "AI 自动识别各个部件——台面、框架、边缘和饰条——以便精准分配材料。", ar: "يحدد الذكاء الاصطناعي الأجزاء المختلفة تلقائياً — الأسطح والهياكل والحواف والحليات — لتعيين الخامات بدقة.", id: "AI otomatis mengenali bagian berbeda — permukaan, rangka, tepi, dan trim — untuk penetapan material yang presisi." },
  "Shape Preservation": { zh: "形状保持", ar: "الحفاظ على الشكل", id: "Pelestarian Bentuk" },
  "Our technology strictly maintains the original furniture silhouette. No added elements, no distortions.":
    { zh: "我们的技术严格保持家具原始轮廓，不添加元素，不产生变形。", ar: "تحافظ تقنيتنا بصرامة على الشكل الأصلي للأثاث. بلا عناصر مضافة ولا تشوهات.", id: "Teknologi kami menjaga siluet asli furnitur secara ketat. Tanpa elemen tambahan, tanpa distorsi." },
  "100+ Premium Materials": { zh: "100+ 种优质材料", ar: "أكثر من 100 خامة فاخرة", id: "100+ Material Premium" },
  "Choose from an extensive library of real wood veneers, natural stones, metals, fabrics, and 3D textures.":
    { zh: "从丰富的实木饰面、天然石材、金属、面料和 3D 纹理库中选择。", ar: "اختر من مكتبة واسعة من قشرة الخشب الطبيعي والأحجار والمعادن والأقمشة والقوام ثلاثي الأبعاد.", id: "Pilih dari pustaka luas veneer kayu asli, batu alam, logam, kain, dan tekstur 3D." },
  "See It In Action": { zh: "立即体验", ar: "شاهدها أثناء العمل", id: "Lihat Langsung" },
  "Try our customizer with your own furniture": { zh: "用您自己的家具试用定制工具", ar: "جرّب أداة التخصيص مع أثاثك", id: "Coba kustomizer kami dengan furnitur Anda" },
  "Try Now": { zh: "立即试用", ar: "جرّب الآن", id: "Coba Sekarang" },
  "Our Philosophy": { zh: "我们的理念", ar: "فلسفتنا", id: "Filosofi Kami" },
  "Function": { zh: "功能", ar: "الوظيفة", id: "Fungsi" },
  "Quality": { zh: "品质", ar: "الجودة", id: "Kualitas" },
  "Design": { zh: "设计", ar: "التصميم", id: "Desain" },
  "Value": { zh: "价值", ar: "القيمة", id: "Nilai" },
  "Sustainability": { zh: "可持续性", ar: "الاستدامة", id: "Keberlanjutan" },
  "Ready to Transform Your Furniture?": { zh: "准备好改造您的家具了吗？", ar: "هل أنت مستعد لتحويل أثاثك؟", id: "Siap Mengubah Furnitur Anda?" },
  "Start customizing with our AI-powered tool — no design experience needed.":
    { zh: "使用我们的 AI 工具开始定制——无需设计经验。", ar: "ابدأ التخصيص بأداتنا المدعومة بالذكاء الاصطناعي — دون خبرة تصميم.", id: "Mulai kustomisasi dengan alat AI kami — tanpa perlu pengalaman desain." },
  "All rights reserved.": { zh: "版权所有。", ar: "جميع الحقوق محفوظة.", id: "Hak cipta dilindungi." },

  // --- Login ---
  "Sign in": { zh: "登录", ar: "تسجيل الدخول", id: "Masuk" },
  "Sign In": { zh: "登录", ar: "تسجيل الدخول", id: "Masuk" },
  "Signing in...": { zh: "正在登录…", ar: "جارٍ تسجيل الدخول…", id: "Sedang masuk..." },
  "Access is by invitation only. Use the credentials provided to you.":
    { zh: "仅限受邀访问，请使用提供给您的账号登录。", ar: "الدخول بدعوة فقط. استخدم بيانات الاعتماد المقدمة لك.", id: "Akses hanya dengan undangan. Gunakan kredensial yang diberikan kepada Anda." },
  "Email": { zh: "邮箱", ar: "البريد الإلكتروني", id: "Email" },
  "Password": { zh: "密码", ar: "كلمة المرور", id: "Kata Sandi" },
  "Terms": { zh: "条款", ar: "الشروط", id: "Ketentuan" },
  "Privacy": { zh: "隐私", ar: "الخصوصية", id: "Privasi" },
  "Sign in to upload furniture, apply premium materials, and place your pieces into any interior — in seconds.":
    { zh: "登录即可上传家具、应用优质材料，并在几秒内将作品放入任意室内场景。", ar: "سجّل الدخول لرفع الأثاث وتطبيق الخامات الفاخرة ووضع قطعك في أي مساحة داخلية — في ثوانٍ.", id: "Masuk untuk mengunggah furnitur, menerapkan material premium, dan menempatkan produk Anda di interior mana pun — dalam hitungan detik." },
  "Welcome back": { zh: "欢迎回来", ar: "مرحباً بعودتك", id: "Selamat datang kembali" },

  // --- Customizer flow ---
  "Upload": { zh: "上传", ar: "رفع", id: "Unggah" },
  "Configure": { zh: "配置", ar: "التهيئة", id: "Konfigurasi" },
  "Generate": { zh: "生成", ar: "إنشاء", id: "Buat" },
  "Choose Patterns": { zh: "选择图案", ar: "اختر الأنماط", id: "Pilih Pola" },
  "Material Patterns": { zh: "材料图案", ar: "أنماط الخامات", id: "Pola Material" },
  "Furniture Parts": { zh: "家具部件", ar: "أجزاء الأثاث", id: "Bagian Furnitur" },
  "Preview & Generate": { zh: "预览与生成", ar: "المعاينة والإنشاء", id: "Pratinjau & Buat" },
  "Place in Background": { zh: "放入背景", ar: "ضعها في خلفية", id: "Tempatkan di Latar" },
  "Add your furniture photo": { zh: "添加您的家具照片", ar: "أضف صورة أثاثك", id: "Tambahkan foto furnitur Anda" },
  "Drag & drop your furniture image": { zh: "拖放您的家具图片", ar: "اسحب وأفلت صورة أثاثك", id: "Seret & lepas gambar furnitur Anda" },
  "Drop your image here": { zh: "将图片拖到此处", ar: "أفلت صورتك هنا", id: "Letakkan gambar Anda di sini" },
  "browse files": { zh: "浏览文件", ar: "تصفح الملفات", id: "telusuri berkas" },
  "Analyzing furniture parts...": { zh: "正在分析家具部件…", ar: "جارٍ تحليل أجزاء الأثاث…", id: "Menganalisis bagian furnitur..." },
  "Analyzing furniture...": { zh: "正在分析家具…", ar: "جارٍ تحليل الأثاث…", id: "Menganalisis furnitur..." },
  "Detecting parts...": { zh: "正在识别部件…", ar: "جارٍ كشف الأجزاء…", id: "Mendeteksi bagian..." },
  "AI is detecting customizable parts": { zh: "AI 正在识别可定制部件", ar: "يكتشف الذكاء الاصطناعي الأجزاء القابلة للتخصيص", id: "AI sedang mendeteksi bagian yang dapat dikustomisasi" },
  "AI is transforming...": { zh: "AI 正在改造…", ar: "الذكاء الاصطناعي يقوم بالتحويل…", id: "AI sedang mengubah..." },
  "AI is applying the selected patterns...": { zh: "AI 正在应用所选图案…", ar: "يطبّق الذكاء الاصطناعي الأنماط المختارة…", id: "AI sedang menerapkan pola yang dipilih..." },
  "AI is placing your furniture in the scene...": { zh: "AI 正在将您的家具放入场景…", ar: "يضع الذكاء الاصطناعي أثاثك في المشهد…", id: "AI sedang menempatkan furnitur Anda di dalam scene..." },
  "AI is choosing colors that match your room...": { zh: "AI 正在挑选与您房间搭配的颜色…", ar: "يختار الذكاء الاصطناعي ألواناً تناسب غرفتك…", id: "AI sedang memilih warna yang cocok dengan ruangan Anda..." },
  "Creating your design...": { zh: "正在创建您的设计…", ar: "جارٍ إنشاء تصميمك…", id: "Membuat desain Anda..." },
  "Compositing scene...": { zh: "正在合成场景…", ar: "جارٍ تركيب المشهد…", id: "Menggabungkan scene..." },
  "Cleaning background to pure white...": { zh: "正在将背景清理为纯白…", ar: "جارٍ تنظيف الخلفية إلى الأبيض النقي…", id: "Membersihkan latar menjadi putih murni..." },
  "No parts detected yet": { zh: "尚未识别到部件", ar: "لم يتم اكتشاف أجزاء بعد", id: "Belum ada bagian terdeteksi" },
  "Assign patterns to furniture parts": { zh: "为家具部件分配图案", ar: "عيّن الأنماط لأجزاء الأثاث", id: "Tetapkan pola ke bagian furnitur" },
  "Assign at least one pattern": { zh: "请至少分配一个图案", ar: "عيّن نمطاً واحداً على الأقل", id: "Tetapkan setidaknya satu pola" },
  "Choose patterns for different parts": { zh: "为不同部件选择图案", ar: "اختر أنماطاً لأجزاء مختلفة", id: "Pilih pola untuk bagian berbeda" },
  "Generate your customized furniture": { zh: "生成您的定制家具", ar: "أنشئ أثاثك المخصص", id: "Buat furnitur kustom Anda" },
  "AI creates your customized design": { zh: "AI 创建您的定制设计", ar: "ينشئ الذكاء الاصطناعي تصميمك المخصص", id: "AI membuat desain kustom Anda" },
  "AI creates your design": { zh: "AI 创建您的设计", ar: "ينشئ الذكاء الاصطناعي تصميمك", id: "AI membuat desain Anda" },
  "Design generated successfully!": { zh: "设计生成成功！", ar: "تم إنشاء التصميم بنجاح!", id: "Desain berhasil dibuat!" },
  "Furniture placed in background successfully!": { zh: "家具已成功放入背景！", ar: "تم وضع الأثاث في الخلفية بنجاح!", id: "Furnitur berhasil ditempatkan di latar!" },
  "Image pasted from clipboard": { zh: "已从剪贴板粘贴图片", ar: "تم لصق الصورة من الحافظة", id: "Gambar ditempel dari papan klip" },
  "Image uploaded! AI is analyzing the furniture parts...": { zh: "图片已上传！AI 正在分析家具部件…", ar: "تم رفع الصورة! يحلل الذكاء الاصطناعي أجزاء الأثاث…", id: "Gambar diunggah! AI sedang menganalisis bagian furnitur..." },
  "Are you satisfied with the design?": { zh: "您对这个设计满意吗？", ar: "هل أنت راضٍ عن التصميم؟", id: "Apakah Anda puas dengan desainnya?" },
  "Background scene": { zh: "背景场景", ar: "مشهد الخلفية", id: "Scene latar" },
  "Background loaded": { zh: "背景已加载", ar: "تم تحميل الخلفية", id: "Latar dimuat" },
  "Furniture in background": { zh: "背景中的家具", ar: "الأثاث في الخلفية", id: "Furnitur di latar" },
  "Furniture to customize": { zh: "待定制的家具", ar: "الأثاث المراد تخصيصه", id: "Furnitur untuk dikustomisasi" },
  "Furniture removed": { zh: "已移除家具", ar: "تمت إزالة الأثاث", id: "Furnitur dihapus" },
  "Generated preview": { zh: "生成的预览", ar: "المعاينة المُنشأة", id: "Pratinjau hasil" },
  "Add More": { zh: "添加更多", ar: "أضف المزيد", id: "Tambah Lagi" },
  "Clear": { zh: "清除", ar: "مسح", id: "Bersihkan" },
  "Close": { zh: "关闭", ar: "إغلاق", id: "Tutup" },
  "Next": { zh: "下一步", ar: "التالي", id: "Berikutnya" },
  "Previous": { zh: "上一步", ar: "السابق", id: "Sebelumnya" },
  "Download": { zh: "下载", ar: "تنزيل", id: "Unduh" },
  "Format": { zh: "格式", ar: "الصيغة", id: "Format" },
  "File Name": { zh: "文件名", ar: "اسم الملف", id: "Nama Berkas" },
  "Original (1x)": { zh: "原始 (1x)", ar: "الأصلي (1x)", id: "Asli (1x)" },
  "High (2x)": { zh: "高清 (2x)", ar: "عالي (2x)", id: "Tinggi (2x)" },
  "PNG (Best Quality)": { zh: "PNG（最佳质量）", ar: "PNG (أفضل جودة)", id: "PNG (Kualitas Terbaik)" },
  "JPG (Smaller Size)": { zh: "JPG（较小体积）", ar: "JPG (حجم أصغر)", id: "JPG (Ukuran Lebih Kecil)" },
  "WebP (Web Optimized)": { zh: "WebP（网页优化）", ar: "WebP (محسّن للويب)", id: "WebP (Optimal untuk Web)" },
  "AI Color Suggestion": { zh: "AI 配色建议", ar: "اقتراح ألوان بالذكاء الاصطناعي", id: "Saran Warna AI" },
  "AI color suggestion ready!": { zh: "AI 配色建议已就绪！", ar: "اقتراح الألوان جاهز!", id: "Saran warna AI siap!" },
  "Step 1 · Upload your room background": { zh: "第 1 步 · 上传房间背景", ar: "الخطوة 1 · ارفع خلفية غرفتك", id: "Langkah 1 · Unggah latar ruangan Anda" },
  "Step 2 · Upload your furniture": { zh: "第 2 步 · 上传您的家具", ar: "الخطوة 2 · ارفع أثاثك", id: "Langkah 2 · Unggah furnitur Anda" },
  "Failed to analyze image": { zh: "图片分析失败", ar: "فشل تحليل الصورة", id: "Gagal menganalisis gambar" },
  "Failed to generate. Please try again.": { zh: "生成失败，请重试。", ar: "فشل الإنشاء. حاول مرة أخرى.", id: "Gagal membuat. Silakan coba lagi." },
  "Failed to place furniture. Please try again.": { zh: "家具放置失败，请重试。", ar: "فشل وضع الأثاث. حاول مرة أخرى.", id: "Gagal menempatkan furnitur. Silakan coba lagi." },

  // --- Admin ---
  "Admin Dashboard": { zh: "管理后台", ar: "لوحة تحكم المشرف", id: "Dasbor Admin" },
  "Users": { zh: "用户", ar: "المستخدمون", id: "Pengguna" },
  "AI Usage": { zh: "AI 使用情况", ar: "استخدام الذكاء الاصطناعي", id: "Penggunaan AI" },
  "AI Chat": { zh: "AI 聊天", ar: "محادثة الذكاء الاصطناعي", id: "Obrolan AI" },
  "Saved Furniture": { zh: "已保存的家具", ar: "الأثاث المحفوظ", id: "Furnitur Tersimpan" },
  "Recent activity": { zh: "最近活动", ar: "النشاط الأخير", id: "Aktivitas Terbaru" },
  "No usage recorded yet.": { zh: "暂无使用记录。", ar: "لا يوجد استخدام مسجل بعد.", id: "Belum ada penggunaan tercatat." },
  "No users yet.": { zh: "暂无用户。", ar: "لا يوجد مستخدمون بعد.", id: "Belum ada pengguna." },
  "Save as verified": { zh: "保存为已验证", ar: "احفظ كمُتحقق منه", id: "Simpan sebagai terverifikasi" },
  "Thinking…": { zh: "思考中…", ar: "جارٍ التفكير…", id: "Berpikir…" },
  "Credits & Top-up": { zh: "额度与充值", ar: "الرصيد والشحن", id: "Kredit & Isi Ulang" },

  // --- Misc ---
  "Oops! Page not found": { zh: "哎呀！页面未找到", ar: "عذراً! الصفحة غير موجودة", id: "Ups! Halaman tidak ditemukan" },
  "Return to Home": { zh: "返回首页", ar: "العودة إلى الرئيسية", id: "Kembali ke Beranda" },
};

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

const INDEX: Record<string, Entry> = Object.keys(DICTIONARY).reduce((acc, key) => {
  acc[normalize(key).toLowerCase()] = DICTIONARY[key];
  return acc;
}, {} as Record<string, Entry>);

export function translatePhrase(text: string, lang: Lang): string | null {
  if (lang === "en") return null;
  const raw = text;
  const trimmed = normalize(raw);
  if (!trimmed) return null;
  const entry = INDEX[trimmed.toLowerCase()];
  if (!entry) return null;
  const value = entry[lang];
  if (!value) return null;
  // preserve original leading/trailing whitespace
  const lead = raw.match(/^\s*/)?.[0] ?? "";
  const tail = raw.match(/\s*$/)?.[0] ?? "";
  return `${lead}${value}${tail}`;
}
