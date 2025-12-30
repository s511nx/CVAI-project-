const express = require("express");
const path = require("path");
require("dotenv").config();
const multer = require("multer");
const pdfParse = require("pdf-parse");


const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static("public"));




// =====================
// PDF text extraction
// =====================
async function extractedTextFromPdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text || "";
}

// =====================
// Basic info detection
// =====================
function detectBasicInfo(extractedText) {
  const lines = extractedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const emailMatch = extractedText.match(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
  );
  const email = emailMatch ? emailMatch[0] : null;

  const phoneMatch = extractedText.match(/(\+?966|0)?\s?\d{9}/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  let name = null;
  for (const line of lines.slice(0, 4)) {
    if (!/cv|resume|curriculum vitae/i.test(line) && line.length <= 60) {
      name = line;
      break;
    }
  }

  const missingFields = [];
  if (!name) missingFields.push("name");
  if (!email) missingFields.push("email");
  if (!phone) missingFields.push("phone");

  return {
    name,
    email,
    phone,
    missingFields,
  };
}



app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.post("/api/cv", upload.single("cvfile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No File Uploaded",
      });
    }

    console.log("Received File:", req.file.originalname);

    const pdfBuffer = req.file.buffer;
    const extractedText = await extractedTextFromPdf(pdfBuffer);

    console.log("Extracted text length:", extractedText.length);

    const basicInfo = detectBasicInfo(extractedText);

    return res.json({
      success: true,
      extractedText,
      basicInfo,
      missingFields: basicInfo.missingFields,
    });
  } catch (error) {
    console.error("Error while processing CV:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing the CV file",
    });
  }
});
app.post("/api/generate", async (req, res) => {
    try {
      const { extractedText, name, email, phone, jobDescription } = req.body;
  
      if (!extractedText || !name) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: extractedText and name are required.",
        });
      }
// استبدل فقط الـ prompt في الكود الموجود لديك:

const prompt = `
أنت نظام خبير متخصص في إنشاء سير ذاتية محسّنة لأنظمة التتبع الآلي (ATS) من مدخلات عربية أو إنجليزية.
مهمتك هي الترجمة، التنظيف، إعادة الكتابة، والهيكلة مع الحفاظ على الدقة الواقعية.

${jobDescription ? `
═══════════════════════════════════════════════════════════════════════════════
تحذير مهم جداً - اقرأ هذا أولاً!
═══════════════════════════════════════════════════════════════════════════════
وصف الوظيفة المستهدفة متوفر أدناه. يجب تخصيص السيرة الذاتية بالكامل 100% لهذه الوظيفة المحددة!

قبل البدء في أي شيء، اقرأ وصف الوظيفة بعناية فائقة واستخرج:
- المهارات المطلوبة (مثل: Python, React, AWS, etc.)
- التقنيات والأدوات المذكورة
- المسؤوليات الرئيسية
- المتطلبات التعليمية أو الشهادات
- الكلمات المفتاحية والمصطلحات التقنية

يجب أن يكون Professional Summary مخصص 100% لهذه الوظيفة ويبدأ بذكر الوظيفة المستهدفة!

═══════════════════════════════════════════════════════════════════════════════
وصف الوظيفة المستهدفة (هذا هو الدليل الرئيسي - استخدمه في كل قسم):
═══════════════════════════════════════════════════════════════════════════════
"""
${jobDescription}
"""

تذكير: استخدم هذا الوصف في كل قسم من السيرة الذاتية - خاصة Professional Summary!

═══════════════════════════════════════════════════════════════════════════════

` : ""}========================
قواعد صارمة:
========================
- لا تخترع أو تضيف أو تفترض أي مهارات، أدوات، إنجازات، شركات، مسؤوليات، أو تواريخ غير موجودة في السيرة الذاتية الأصلية.
- يمكنك إعادة صياغة الجمل لتحسين الوضوح والاحترافية، لكن يجب الحفاظ على نفس المعنى الواقعي.
- إذا كان القسم موجوداً في السيرة الأصلية، قم بتضمينه. إذا لم يكن موجوداً، أنشئ القسم لكن اتركه فارغاً أو بحد أدنى من المحتوى.
- لا تستخدم أبداً عناصر نائبة مثل "[Year]" — اترك الحقل فارغاً بدلاً من ذلك إذا كان مفقوداً.
- لا تضف مهارات تقنية إلا إذا ذُكرت صراحة.
- يجب أن يبقى الناتج دائماً قابلاً للقراءة البشرية وبسيطاً (متوافق مع ATS).
${jobDescription ? `- وصف الوظيفة متوفر: يجب أن تكون السيرة الذاتية مخصصة 100% لهذه الوظيفة - استخدم نفس المصطلحات والمهارات المذكورة في الوظيفة. Professional Summary يجب أن يبدأ بذكر الوظيفة المستهدفة!` : ""}

========================
معلومات المستخدم:
========================
- الاسم الكامل: ${name}
- البريد الإلكتروني: ${email || "غير محدد"}
- الهاتف: ${phone || "غير محدد"}

========================
نص السيرة الذاتية الأصلي:
========================
"""
${extractedText}
"""

========================
المهام الرئيسية للمعالجة:
========================
1. اكتشف ما إذا كان النص بالعربية ← قم بترجمته إلى إنجليزية احترافية واضحة مع الحفاظ على دقة المعنى.

${jobDescription ? `2. تخصيص السيرة الذاتية بناءً على وصف الوظيفة (أولوية قصوى - اقرأ هذا بعناية!):
   
   أولاً: استخراج المعلومات من وصف الوظيفة:
   - اقرأ وصف الوظيفة بعناية فائقة واستخرج:
     * جميع المهارات المطلوبة (مثل: Python, React, AWS, etc.)
     * جميع التقنيات والأدوات المذكورة
     * المسؤوليات الرئيسية المطلوبة
     * المتطلبات التعليمية أو الشهادات
     * سنوات الخبرة المطلوبة
     * أي كلمات مفتاحية أو مصطلحات تقنية محددة
   
   ثانياً: كتابة Professional Summary (هذا مهم جداً - اقرأ بعناية!):
   - يجب أن يبدأ Professional Summary بذكر الوظيفة المستهدفة مباشرة أو الدور المطلوب
   - يجب أن يذكر بوضوح كيف تتوافق خبرات المرشح مع متطلبات الوظيفة المحددة
   - يجب أن يستخدم نفس المصطلحات والمهارات المذكورة في وصف الوظيفة بالضبط
   - يجب أن يبرز المهارات الرئيسية المطلوبة للوظيفة من خبرات المرشح
   - يجب أن يكون Professional Summary مخصص 100% لهذه الوظيفة - لا تستخدم نص عام!
   
   صيغة Professional Summary المطلوبة:
   - ابدأ بذكر الدور أو الوظيفة المستهدفة (مثل: "Experienced [Job Title from job description]...")
   - اذكر سنوات الخبرة إذا كانت متوفرة
   - اذكر المهارات الرئيسية المطلوبة في الوظيفة (من وصف الوظيفة) التي يمتلكها المرشح
   - اذكر كيف تتوافق خبراته مع متطلبات الوظيفة
   - استخدم نفس الكلمات المفتاحية من وصف الوظيفة
   
   مثال على Professional Summary جيد:
   "Experienced [Job Title] with [X] years of expertise in [key skill 1], [key skill 2], and [key skill 3] as required for this role. Proven track record in [relevant experience from CV that matches job requirements]. Skilled in [technologies/tools from job description] with demonstrated ability to [key responsibility from job description]. Seeking to leverage [relevant skills] to contribute to [company/role objectives from job description]."
   
   ثالثاً: قسم Skills:
   - رتّب المهارات بحيث تظهر المهارات المذكورة في وصف الوظيفة أولاً
   - استخدم نفس المصطلحات المستخدمة في وصف الوظيفة بالضبط
   - إذا كانت المهارة في السيرة الأصلية تتطابق مع متطلبات الوظيفة، ضعها في المقدمة
   
   رابعاً: قسم Experience:
   - أعد صياغة الوصف الوظيفي لكل تجربة لتبرز الجوانب التي تتوافق مع متطلبات الوظيفة المستهدفة
   - استخدم الكلمات المفتاحية من وصف الوظيفة في وصف كل تجربة
   - إذا كانت هناك خبرات أو مشاريع في السيرة تتعلق بمتطلبات الوظيفة، اكتب عنها بتفصيل أكثر
   - ركز على الإنجازات والمسؤوليات التي تتطابق مع ما هو مطلوب في الوظيفة
   
   خامساً: جميع الأقسام:
   - استخدم الكلمات المفتاحية من وصف الوظيفة بشكل طبيعي ومتكرر في جميع أقسام السيرة
   - تأكد من أن كل قسم يعكس بشكل مباشر أو غير مباشر كيف يلبي المرشح متطلبات الوظيفة

3. ` : "2. "}أعد كتابة المحتوى وهيكلته ليصبح سيرة ذاتية محسّنة بالكامل لأنظمة ATS، باتباع هذا الترتيب الثابت للأقسام:
   - Professional Summary${jobDescription ? " (يجب أن يكون مخصص 100% للوظيفة المذكورة في وصف الوظيفة - ابدأ بذكر الوظيفة المستهدفة)" : ""}
   - Skills (فقط إذا ذُكرت في السيرة الأصلية)
   - Experience (أو Training إن وُجد)
   - Education
   - Certifications (فقط إذا ذُكرت صراحة في السيرة الأصلية - إذا لم تكن موجودة، لا تضف هذا القسم نهائياً)
   - Languages (فقط اللغات المذكورة في النص الأصلي)
   
   مهم جداً: إذا لم يكن هناك أي شهادات (Certifications) في السيرة الأصلية، لا تضف قسم Certifications في السيرة النهائية. اتركه تماماً.

${jobDescription ? "4. " : "3. "}حسّن وضوح الجمل باستخدام أفعال إنجاز واقعية، لكن بدون إضافة معلومات جديدة.

${jobDescription ? "5. " : "4. "}استخدم التنسيق القياسي المتوافق مع ATS:
   - بدون جداول
   - بدون أيقونات
   - بدون رموز خاصة
   - بدون استخدام علامة # في أي مكان
   - نقاط بسيطة فقط ("-")

${jobDescription ? `6. التحقق النهائي من التخصيص (قبل إرسال الناتج، تأكد من كل نقطة):
   - تأكد من أن Professional Summary يبدأ بذكر الوظيفة المستهدفة أو الدور المطلوب
   - تأكد من أن Professional Summary يستخدم نفس المصطلحات والمهارات المذكورة في وصف الوظيفة
   - تأكد من أن Professional Summary يوضح بوضوح كيف تتوافق خبرات المرشح مع متطلبات الوظيفة
   - تأكد من أن السيرة الذاتية تحتوي على معظم (إن لم يكن جميع) المهارات المذكورة في وصف الوظيفة
   - تأكد من استخدام نفس المصطلحات والمفردات المستخدمة في وصف الوظيفة في جميع الأقسام
   - تأكد من أن كل قسم يعزز فكرة أن المرشح مناسب لهذه الوظيفة المحددة
   - إذا كان Professional Summary لا يذكر الوظيفة المستهدفة أو لا يستخدم مصطلحات من وصف الوظيفة، أعد كتابته بالكامل!` : "5. اضبط الأسلوب ليناسب المرشحين ذوي المستوى المبتدئ في مجالات تقنية المعلومات / علوم الحاسب / البرمجيات / ضمان الجودة / Backend (فقط إذا كان المحتوى الأصلي يدعم ذلك)."}

========================
التوصيات المهنية (باللغة العربية - مختصرة):
========================
قدّم توصيات مختصرة ومباشرة بناءً على محتوى السيرة${jobDescription ? " ووصف الوظيفة المستهدفة" : ""}:

أ) نصائح التطوير (3-4 نصائح فقط):
   - نصائح محددة وعملية مباشرة
   - بدون شرح مطول - جملة واحدة لكل نصيحة

ب) الشهادات الموصى بها (4-6 شهادات):
   - اذكر فقط: الاسم بالإنجليزية + الأولوية + التكلفة التقريبية
   - بدون شرح مفصل
   
   أمثلة للشهادات القيّمة:
   - AWS Certified Solutions Architect
   - Google Cloud Professional
   - ISTQB Foundation (للـ QA)
   - Certified Kubernetes Administrator
   - CompTIA Security+
   - PMP أو Scrum Master

ج) برامج أكاديمية (2-3 اقتراحات فقط):
   - ماجستير متخصص ذو علاقة بالمجال
   - أو Bootcamp مكثف (Tuwaiq Academy, Coded, Le Wagon)
   - اذكر فقط الاسم + نوع البرنامج

د) مهارات للتعلم (3-4 مهارات فقط):
   - اذكر اسم المهارة + منصة تعليمية واحدة فقط
   - مثال: "Docker & Kubernetes - KodeKloud"

========================
تنسيق الناتج:
========================
أرجع الناتج بصيغة JSON صارمة:
{
  "generatedCv": "string — السيرة الذاتية النهائية بالإنجليزية",
  "tips": [
    "═══════════════════════════════════════════",
    "📊 نصائح تطوير المسار المهني",
    "═══════════════════════════════════════════",
    "",
    "🎯 خطوات التطوير:",
    "• [نصيحة مختصرة 1]",
    "• [نصيحة مختصرة 2]",
    "• [نصيحة مختصرة 3]",
    "",
    "🎓 شهادات موصى بها:",
    "⭐ [اسم الشهادة] - أولوية عالية - $[التكلفة]",
    "⭐ [اسم الشهادة] - أولوية عالية - $[التكلفة]",
    "📌 [اسم الشهادة] - أولوية متوسطة - $[التكلفة]",
    "",
    "📚 برامج مقترحة:",
    "• [نوع البرنامج]: [الاسم]",
    "• [نوع البرنامج]: [الاسم]",
    "",
    "💻 مهارات للتعلم:",
    "• [المهارة] - [منصة التعلم]",
    "• [المهارة] - [منصة التعلم]",
    "",
    "═══════════════════════════════════════════"
  ]
}

ملاحظات:
- اجعل كل شيء مختصراً ومباشراً
- بدون شروحات طويلة
- التركيز على المعلومات الأساسية فقط
- لا تستخدم علامة # في أي مكان في السيرة الذاتية أو النصائح
- جميع النصائح مخصصة بناءً على السيرة الفعلية${jobDescription ? " ووصف الوظيفة المستهدفة" : ""}
${jobDescription ? `
تذكير نهائي مهم جداً:
- السيرة الذاتية يجب أن تكون مخصصة 100% للوظيفة المذكورة في وصف الوظيفة
- Professional Summary يجب أن يبدأ بذكر الوظيفة المستهدفة ويستخدم مصطلحات من وصف الوظيفة
- إذا لم يكن Professional Summary مخصص للوظيفة، أعد كتابته بالكامل!
- استخدم نفس المصطلحات والمهارات المذكورة في وصف الوظيفة في جميع الأقسام
- لا ترسل سيرة ذاتية عامة - يجب أن تكون مخصصة لهذه الوظيفة المحددة!` : ""}
`;
      
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = "gemini-2.5-flash-lite"; 

  const url =
  "https://generativelanguage.googleapis.com/v1/models/" +
  modelName +
  ":generateContent?key=" +
  apiKey;


  
      const body = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      };
  
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      const geminiJson = await geminiRes.json();
  
      if (!geminiRes.ok) {
        console.error("Gemini API error:", geminiJson);
        return res.status(500).json({
          success: false,
          message: "Gemini API error",
        });
      }
  
      let responseText =
        geminiJson.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("\n")
          .trim() || "";
  
     
      if (responseText.startsWith("```")) {
        responseText = responseText
          .replace(/```[a-zA-Z]*\n?/, "")
          .replace(/```$/, "")
          .trim();
      }
  
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", e);
        console.log("Raw response:\n", responseText);
        return res.status(500).json({
          success: false,
          message: "Failed to parse AI response.",
        });
      }
  
      return res.json({
        success: true,
        generatedCv: parsed.generatedCv || "",
        tips: parsed.tips || [],
      });
    } catch (error) {
      console.error("Error in /api/generate:", error);
      return res.status(500).json({
        success: false,
        message: "Error while generating CV with AI.",
      });
    }
  });
  

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});
