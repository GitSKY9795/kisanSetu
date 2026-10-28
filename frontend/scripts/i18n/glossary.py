"""Hand-written translations that take priority over the machine output.

Column order everywhere:  hi, mr, gu, pa, te, ta, bn   (None = keep the machine translation)
"""

LANGS = ["hi", "mr", "gu", "pa", "te", "ta", "bn"]

GLOSSARY = {}


def row(phrase, *values):
    assert len(values) == 7, phrase
    GLOSSARY[phrase] = {lang: v for lang, v in zip(LANGS, values) if v}


# ---------------------------------------------------------------- units
KG = ("किलो", "किलो", "કિલો", "ਕਿਲੋ", "కిలో", "கிலோ", "কেজি")
QTL = ("क्विंटल", "क्विंटल", "ક્વિન્ટલ", "ਕੁਇੰਟਲ", "క్వింటాల్", "குவிண்டால்", "কুইন্টাল")
KM = ("किमी", "किमी", "કિમી", "ਕਿਮੀ", "కి.మీ", "கி.மீ", "কিমি")
DAY = ("दिन", "दिवस", "દિવસ", "ਦਿਨ", "రోజు", "நாள்", "দিন")

row("kg", *KG)
row("km", *KM)
row("/kg", *("/" + x for x in KG))
row("/ kg", *("/ " + x for x in KG))
row("/qtl", *("/" + x for x in QTL))
row("/ qtl", *("/ " + x for x in QTL))
row("/ qtl / day", *(f"/ {q} / {d}" for q, d in zip(QTL, DAY)))
row("Price (₹/qtl)", "मूल्य (₹/क्विंटल)", "किंमत (₹/क्विंटल)", "કિંમત (₹/ક્વિન્ટલ)", "ਕੀਮਤ (₹/ਕੁਇੰਟਲ)", "ధర (₹/క్వింటాల్)", "விலை (₹/குவிண்டால்)", "মূল্য (₹/কুইন্টাল)")
row("7.0% p.a.", "7.0% वार्षिक", "7.0% वार्षिक", "7.0% વાર્ષિક", "7.0% ਸਾਲਾਨਾ", "7.0% వార్షిక", "ஆண்டுக்கு 7.0%", "বার্ষিক 7.0%")
row("Total Interest ({months} mo)", "कुल ब्याज ({months} माह)", "एकूण व्याज ({months} महिने)", "કુલ વ્યાજ ({months} મહિના)", "ਕੁੱਲ ਵਿਆਜ ({months} ਮਹੀਨੇ)", "మొత్తం వడ్డీ ({months} నెలలు)", "மொத்த வட்டி ({months} மாதங்கள்)", "মোট সুদ ({months} মাস)")

# ---------------------------------------------------------------- crops
row("Wheat", "गेहूँ", "गहू", "ઘઉં", "ਕਣਕ", "గోధుమ", "கோதுமை", "গম")
row("Rice", "चावल", "तांदूळ", "ચોખા", "ਚਾਵਲ", "బియ్యం", "அரிசி", "চাল")
row("Paddy (Dhan)", "धान", "भात (धान)", "ડાંગર", "ਝੋਨਾ", "వరి", "நெல்", "ধান")
row("Maize", "मक्का", "मका", "મકાઈ", "ਮੱਕੀ", "మొక్కజొన్న", "மக்காச்சோளம்", "ভুট্টা")
row("Soybean", "सोयाबीन", "सोयाबीन", "સોયાબીન", "ਸੋਇਆਬੀਨ", "సోయాబీన్", "சோயாபீன்ஸ்", "সয়াবিন")
row("Mustard", "सरसों", "मोहरी", "રાઈ", "ਸਰ੍ਹੋਂ", "ఆవాలు", "கடுகு", "সরিষা")
row("Onion", "प्याज़", "कांदा", "ડુંગળી", "ਪਿਆਜ਼", "ఉల్లిపాయ", "வெங்காயம்", "পেঁয়াজ")
row("Potato", "आलू", "बटाटा", "બટાટા", "ਆਲੂ", "బంగాళాదుంప", "உருளைக்கிழங்கு", "আলু")
row("Tomato", "टमाटर", "टोमॅटो", "ટામેટાં", "ਟਮਾਟਰ", "టమాటా", "தக்காளி", "টমেটো")
row("Cotton", "कपास", "कापूस", "કપાસ", "ਕਪਾਹ", "పత్తి", "பருத்தி", "তুলা")
row("Groundnut", "मूंगफली", "भुईमूग", "મગફળી", "ਮੂੰਗਫਲੀ", "వేరుశనగ", "நிலக்கடலை", "চিনাবাদাম")
row("Gram", "चना", "हरभरा", "ચણા", "ਛੋਲੇ", "శనగలు", "கொண்டைக்கடலை", "ছোলা")
row("Chana", "चना", "हरभरा", "ચણા", "ਛੋਲੇ", "శనగలు", "கொண்டைக்கடலை", "ছোলা")
row("Sugarcane", "गन्ना", "ऊस", "શેરડી", "ਗੰਨਾ", "చెరకు", "கரும்பு", "আখ")
row("Turmeric", "हल्दी", "हळद", "હળદર", "ਹਲਦੀ", "పసుపు", "மஞ்சள்", "হলুদ")
row("Banana", "केला", "केळी", "કેળાં", "ਕੇਲਾ", "అరటి", "வாழைப்பழம்", "কলা")
row("Garlic", "लहसुन", "लसूण", "લસણ", "ਲਸਣ", "వెల్లుల్లి", "பூண்டு", "রসুন")
row("Ginger", "अदरक", "आले", "આદુ", "ਅਦਰਕ", "అల్లం", "இஞ்சி", "আদা")
row("Chilli", "मिर्च", "मिरची", "મરચાં", "ਮਿਰਚ", "మిరపకాయ", "மிளகாய்", "লঙ্কা")
row("Cauliflower", "फूलगोभी", "फुलकोबी", "ફૂલકોબી", "ਫੁੱਲ ਗੋਭੀ", "కాలీఫ్లవర్", "காலிஃபிளவர்", "ফুলকপি")
row("Cabbage", "पत्तागोभी", "कोबी", "કોબીજ", "ਬੰਦ ਗੋਭੀ", "క్యాబేజీ", "முட்டைக்கோஸ்", "বাঁধাকপি")
row("Brinjal", "बैंगन", "वांगी", "રીંગણ", "ਬੈਂਗਣ", "వంకాయ", "கத்திரிக்காய்", "বেগুন")
row("Okra", "भिंडी", "भेंडी", "ભીંડા", "ਭਿੰਡੀ", "బెండకాయ", "வெண்டைக்காய்", "ঢেঁড়স")
row("Peas", "मटर", "वाटाणा", "વટાણા", "ਮਟਰ", "బఠానీలు", "பட்டாணி", "মটরশুঁটি")
row("Mango", "आम", "आंबा", "કેરી", "ਅੰਬ", "మామిడి", "மாம்பழம்", "আম")
row("Lemon", "नींबू", "लिंबू", "લીંબુ", "ਨਿੰਬੂ", "నిమ్మ", "எலுமிச்சை", "লেবু")
row("Apple", "सेब", "सफरचंद", "સફરજન", "ਸੇਬ", "ఆపిల్", "ஆப்பிள்", "আপেল")
row("Grapes", "अंगूर", "द्राक्षे", "દ્રાક્ષ", "ਅੰਗੂਰ", "ద్రాక్ష", "திராட்சை", "আঙুর")
row("Pomegranate", "अनार", "डाळिंब", "દાડમ", "ਅਨਾਰ", "దానిమ్మ", "மாதுளை", "ডালিম")
row("Coriander", "धनिया", "कोथिंबीर", "ધાણા", "ਧਨੀਆ", "కొత్తిమీర", "கொத்தமல்லி", "ধনিয়া")
row("Barley", "जौ", "जव", "જવ", "ਜੌਂ", "బార్లీ", "வாற்கோதுமை", "যব")
row("Jowar", "ज्वार", "ज्वारी", "જુવાર", "ਜਵਾਰ", "జొన్న", "சோளம்", "জোয়ার")
row("Bajra", "बाजरा", "बाजरी", "બાજરી", "ਬਾਜਰਾ", "సజ్జలు", "கம்பு", "বাজরা")
row("Tur / Arhar", "तुअर / अरहर", "तूर", "તુવેર", "ਅਰਹਰ / ਤੂਰ", "కందులు", "துவரை", "অড়হর")
row("Moong", "मूंग", "मूग", "મગ", "ਮੂੰਗੀ", "పెసలు", "பாசிப்பயறு", "মুগ")
row("Urad", "उड़द", "उडीद", "અડદ", "ਮਾਂਹ", "మినుములు", "உளுந்து", "মাষকলাই")
row("Lentil (Masur)", "मसूर", "मसूर", "મસૂર", "ਮਸਰ", "మసూర్ పప్పు", "மைசூர் பருப்பு", "মসুর ডাল")
row("Paddy / Rice", "धान / चावल", "भात / तांदूळ", "ડાંગર / ચોખા", "ਝੋਨਾ / ਚਾਵਲ", "వరి / బియ్యం", "நெல் / அரிசி", "ধান / চাল")
row("Paddy", "धान", "भात", "ડાંગર", "ਝੋਨਾ", "వరి", "நெல்", "ধান")
row("Fruits", "फल", "फळे", "ફળો", "ਫਲ", "పండ్లు", "பழங்கள்", "ফল")
row("Vegetables", "सब्जियाँ", "भाज्या", "શાકભાજી", "ਸਬਜ਼ੀਆਂ", "కూరగాయలు", "காய்கறிகள்", "সবজি")
row("Spices", "मसाले", "मसाले", "મસાલા", "ਮਸਾਲੇ", "సుగంధ ద్రవ్యాలు", "மசாலாப் பொருட்கள்", "মশলা")

# ---------------------------------------------------------------- navigation / generic
row("Home", "होम", "मुख्यपृष्ठ", "હોમ", "ਹੋਮ", "హోమ్", "முகப்பு", "হোম")
row("Logout", "लॉगआउट", "लॉगआउट", "લૉગઆઉટ", "ਲਾਗਆਉਟ", "లాగ్ అవుట్", "வெளியேறு", "লগআউট")
row("Mandi Trends", "मंडी भाव", "मंडी भाव", "મંડી ભાવ", "ਮੰਡੀ ਭਾਅ", "మండి ధరలు", "மண்டி விலைகள்", "মান্ডির দর")
row("Marketplace", None, None, None, None, "మార్కెట్‌ప్లేస్", "சந்தை", None)
row("Storage & Logistics", None, None, None, None, None, None, "সংরক্ষণ ও লজিস্টিক্স")
row("Back", "वापस", None, "પાછળ", None, "వెనుకకు", "பின்செல்", "ফিরে যান")
row("Loading…", None, "लोड होत आहे…", None, "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…", None, None, None)
row("Create Account", None, None, None, None, None, "கணக்கை உருவாக்கவும்", None)
row("Password", None, "पासवर्ड", None, None, "పాస్‌వర్డ్", None, None)
row("Done", None, None, None, "ਹੋ ਗਿਆ", None, None, None)
row("Live", "लाइव", "लाइव्ह", "લાઇવ", "ਲਾਈਵ", "లైవ్", "நேரலை", "লাইভ")
row("● Live", "● लाइव", "● लाइव्ह", "● લાઇવ", "● ਲਾਈਵ", "● లైవ్", "● நேரலை", "● লাইভ")
row("Commodity", "जिंस", "शेतमाल", "કોમોડિટી", "ਜਿਣਸ", "సరుకు", "பொருள்", "পণ্য")
row("Commodity:", "जिंस:", "शेतमाल:", "કોમોડિટી:", "ਜਿਣਸ:", "సరుకు:", "பொருள்:", "পণ্য:")
row("Top Gainers", "सबसे ज़्यादा बढ़त", "सर्वाधिक वाढ", "સૌથી વધુ વધારો", "ਸਭ ਤੋਂ ਵੱਧ ਵਾਧਾ", "అత్యధిక పెరుగుదల", "அதிக உயர்வு", "সর্বোচ্চ বৃদ্ধি")
row("Top Losers", "सबसे ज़्यादा गिरावट", "सर्वाधिक घसरण", "સૌથી વધુ ઘટાડો", "ਸਭ ਤੋਂ ਵੱਧ ਗਿਰਾਵਟ", "అత్యధిక తగ్గుదల", "அதிக வீழ்ச்சி", "সর্বোচ্চ পতন")
row("All Commodities", "सभी जिंस", "सर्व शेतमाल", "બધી કોમોડિટી", "ਸਾਰੀਆਂ ਜਿਣਸਾਂ", "అన్ని సరుకులు", "அனைத்துப் பொருட்கள்", "সব পণ্য")

# ---------------------------------------------------------------- levels / status / decisions
row("SELL NOW", None, "आत्ताच विका", "હમણાં વેચો", None, None, None, None)
row("WAIT", "रुकें", "थांबा", None, None, None, None, None)
row("STORE", "भंडारण करें", "साठवा", "સંગ્રહ કરો", "ਭੰਡਾਰ ਕਰੋ", "నిల్వ చేయండి", "சேமிக்கவும்", "মজুত করুন")
row("AGGREGATE", "एकत्र करें", "एकत्र करा", "એકત્ર કરો", None, None, None, None)
row("Confidence", "विश्वास स्तर", "विश्वास पातळी", "વિશ્વાસ સ્તર", "ਭਰੋਸੇ ਦਾ ਪੱਧਰ", "విశ్వాస స్థాయి", "நம்பிக்கை நிலை", "আস্থার মাত্রা")
row("Demand", "मांग", None, None, None, None, "தேவை", "চাহিদা")
row("Net realization", None, "निव्वळ प्राप्ती", "ચોખ્ખી આવક", None, "నికర ఆదాయం", "நிகர வருவாய்", "নিট প্রাপ্তি")
row("Net Realization", None, "निव्वळ प्राप्ती", "ચોખ્ખી આવક", None, "నికర ఆదాయం", "நிகர வருவாய்", "নিট প্রাপ্তি")
row("High", "उच्च", None, None, "ਉੱਚ", "అధికం", "அதிகம்", "উচ্চ")
row("Medium", None, None, None, None, "మధ్యస్థ", "நடுத்தரம்", None)
row("Moderate", None, None, None, None, "మితం", "மிதம்", None)
row("Low", None, None, "ઓછું", None, None, "குறைவு", "কম")
row("HIGH", "उच्च", "उच्च", "ઉચ્ચ", "ਉੱਚ", "అధికం", "அதிகம்", "উচ্চ")
row("MEDIUM", "मध्यम", "मध्यम", "મધ્યમ", "ਮੱਧਮ", "మధ్యస్థ", "நடுத்தரம்", "মাঝারি")
row("LOW", "कम", "कमी", "ઓછું", "ਘੱਟ", "తక్కువ", "குறைவு", "কম")
row("Clear", "साफ़", "निरभ्र", "સ્વચ્છ", "ਸਾਫ਼", "నిర్మలం", "தெளிவு", "পরিষ্কার")
row("Pending", "लंबित", None, "બાકી", None, "పెండింగ్", "நிலுவையில்", "অপেক্ষমাণ")
row("Accepted", "स्वीकृत", "स्वीकारले", "સ્વીકાર્યું", "ਮਨਜ਼ੂਰ", "ఆమోదించబడింది", "ஏற்கப்பட்டது", "গৃহীত")
row("Completed", "पूर्ण", "पूर्ण", "પૂર્ણ", "ਮੁਕੰਮਲ", "పూర్తయింది", "நிறைவடைந்தது", "সম্পন্ন")
row("Resolved", "हल हुआ", None, None, None, None, None, None)
row("Sold", "बिक गया", "विकले", "વેચાઈ ગયું", "ਵਿਕ ਗਿਆ", "అమ్ముడైంది", "விற்கப்பட்டது", "বিক্রি হয়েছে")
row("Listed", "लिस्ट किया गया", "यादीत", "યાદીમાં", None, "జాబితాలో ఉంది", None, None)
row("Open", "खुला", "खुले", "ખુલ્લું", "ਖੁੱਲ੍ਹਾ", "తెరిచి ఉంది", "திறந்துள்ளது", "খোলা")
row("Closed", "बंद", "बंद", "બંધ", "ਬੰਦ", None, None, "বন্ধ")
row("Matched", "मिलान हुआ", "जुळले", "મેળ ખાય છે", "ਮੇਲ ਹੋਇਆ", "సరిపోలింది", "பொருந்தியது", "মিলেছে")
row("In transit", "रास्ते में", "वाटेत", "રસ્તામાં", "ਰਾਹ ਵਿੱਚ", "రవాణాలో", "வழியில்", "পথে")
row("Dispatched, in transit", "भेजा गया, रास्ते में", "पाठवले, वाटेत", "મોકલ્યું, રસ્તામાં", "ਭੇਜਿਆ ਗਿਆ, ਰਾਹ ਵਿੱਚ", "పంపబడింది, రవాణాలో", "அனுப்பப்பட்டது, வழியில்", "পাঠানো হয়েছে, পথে")

# ---------------------------------------------------------------- Hindi-only fixes (machine output was wrong or stiff)
HI = {
    "Search anything... (crop, mandi, price, etc.)": "कुछ भी खोजें... (फसल, मंडी, कीमत आदि)",
    "Interpreting your voice...": "आपकी आवाज़ समझी जा रही है...",
    "No speech was detected. Please try again.": "कोई आवाज़ नहीं सुनाई दी। कृपया फिर से कोशिश करें।",
    "Buyer requirements are visible to farmers and FPO aggregators as soon as they are posted.": "खरीदारों की ज़रूरतें पोस्ट होते ही किसानों और FPO को दिखने लगती हैं।",
    "My Listings": "मेरी लिस्टिंग",
    "Create New Listing": "नई लिस्टिंग बनाएँ",
    "Track Shipment": "शिपमेंट ट्रैक करें",
    "Best match": "सबसे उपयुक्त",
    "Quoted price": "बताई गई कीमत",
    "Net in hand": "हाथ में शुद्ध राशि",
    "Calculate a sell decision to see your net realization breakdown.": "अपनी शुद्ध प्राप्ति का ब्योरा देखने के लिए बिक्री का फ़ैसला निकालें।",
    "Detected: {crop} ({grade})": "पहचान: {crop} ({grade})",
    "Verify at: {url}": "सत्यापन लिंक: {url}",
    "{pct}% AI Confidence": "{pct}% AI विश्वसनीयता",
    "ID: {id} • Hash: {hash}": "आईडी: {id} • हैश: {hash}",
    "Foreign Matter": "विजातीय पदार्थ",
    "✓ PASS": "✓ उत्तीर्ण",
    "✓ PASS (Grade A Spec)": "✓ उत्तीर्ण (ग्रेड ए मानक)",
    "✓ UNIFORM": "✓ एकसमान",
    "Live mandi price reported today": "आज मंडी का लाइव भाव दर्ज हुआ",
    "From bundled mandi history — no live arrival today": "ऐप में शामिल मंडी इतिहास से — आज कोई लाइव आवक नहीं",
    "Daily modal price from bundled mandi history; latest record {date}. No live arrival reported for {crop} today.": "ऐप में शामिल मंडी इतिहास से दैनिक मॉडल भाव; नवीनतम रिकॉर्ड {date}। आज {crop} की कोई लाइव आवक दर्ज नहीं है।",
    "To nearest mandi · est.": "निकटतम मंडी तक · अनुमानित",
    "Loading price trend…": "भाव का रुझान लोड हो रहा है…",
    "recent history": "हाल का इतिहास",
    "price change pct": "मूल्य परिवर्तन (%)",
    "has storage": "भंडारण उपलब्ध",
    "rain probability pct": "बारिश की संभावना (%)",
    "demand score": "मांग स्कोर",
    "days since harvest": "कटाई के बाद के दिन",
    "current price": "वर्तमान कीमत",
    "predicted price": "अनुमानित कीमत",
    "quantity kg": "मात्रा (किलो)",
    "storage capacity kg": "भंडारण क्षमता (किलो)",
    "price volatility 30d": "भाव में उतार-चढ़ाव (30 दिन)",
    "distance to nearest buyer km": "निकटतम खरीदार तक दूरी (किमी)",
    "transport cost per kg": "परिवहन लागत (प्रति किलो)",
    "storage cost per kg": "भंडारण लागत (प्रति किलो)",
    "Crop has been harvested recently — holding is feasible.": "फसल हाल ही में कटी है — रोककर रखना संभव है।",
    "Available storage is enabling the hold/aggregate option.": "उपलब्ध भंडारण से फसल रोकने या एकत्र करने का विकल्प मिल रहा है।",
    "Holding now will earn more per kg after accounting for storage cost.": "भंडारण लागत निकालने के बाद अभी रोककर रखने से प्रति किलो ज़्यादा कमाई होगी।",
    "Hold for 30 Days (Lean Season)": "30 दिन रोककर रखें (कम आवक का मौसम)",
    "Hold for 15-30 Days": "15-30 दिन रोककर रखें",
    "Lean Season Spike": "कम आवक के मौसम में उछाल",
    "High Arrivals": "आवक ज़्यादा",
    "Stabilizing": "स्थिर हो रहा है",
    "Premium produce with high color uniformity and negligible defects.": "रंग में एकसमान और लगभग बिना दोष वाली प्रीमियम उपज।",
    "Fair quality lot. Recommend discount selling or industrial processor buyer.": "औसत गुणवत्ता की खेप। छूट पर बेचने या औद्योगिक प्रोसेसर खरीदार को देने की सलाह है।",
    "Gate Quality Verified": "गेट पर गुणवत्ता सत्यापित",
    "Buyer Escrow Funded": "खरीदार ने एस्क्रो में राशि जमा की",
    "Payout Released to Farmer": "किसान को भुगतान जारी",
    "Quality gate verified": "गेट पर गुणवत्ता सत्यापित",
    "KisanSetu — strengthening market linkages and transparent price discovery for Indian farmers": "KisanSetu — भारतीय किसानों के लिए बाज़ार से जुड़ाव और पारदर्शी भाव-खोज को मज़बूत बनाना",
    "KisanSetu — Market Linkages & Price Discovery for Farmers": "KisanSetu — किसानों के लिए बाज़ार से जुड़ाव और भाव-खोज",
    "Could not advance milestone": "अगले चरण पर नहीं जा सके",
    "4-Stage Milestone Escrow Settlement Tracker": "4-चरण एस्क्रो भुगतान ट्रैकर",
    "Secured agricultural trade contracts with milestone fund protection.": "हर चरण पर राशि की सुरक्षा के साथ सुरक्षित कृषि व्यापार अनुबंध।",
    "Advance to Stage {n} (Verify Milestone) →": "चरण {n} पर जाएँ (चरण सत्यापित करें) →",
    "Track mediation milestones and settlement status.": "मध्यस्थता के चरण और निपटान की स्थिति देखें।",
    "Escrow Value": "एस्क्रो राशि",
    "Total Escrow Value: {amount}. Funds will be held securely until gate quality inspection.": "कुल एस्क्रो राशि: {amount}। गेट पर गुणवत्ता जाँच तक राशि सुरक्षित रखी जाएगी।",
    "Posting as {name} ({category})": "{name} ({category}) के रूप में पोस्ट कर रहे हैं",
    "Offering as {name} ({category})": "{name} ({category}) के रूप में प्रस्ताव दे रहे हैं",
    "Total Interest": "कुल ब्याज",
    "Live fetched {time}": "लाइव डेटा मिला: {time}",
    "Offer sent to {seller} for {crop}! They'll accept it to lock in the escrow order.": "{seller} को {crop} के लिए प्रस्ताव भेजा गया! स्वीकार होते ही एस्क्रो ऑर्डर पक्का हो जाएगा।",
    "Locking Escrow…": "एस्क्रो लॉक हो रहा है…",
    "Post requirements, browse listings, negotiate direct deals.": "ज़रूरतें पोस्ट करें, लिस्टिंग देखें, सीधे सौदे करें।",
    "Aggregate member produce into bulk lots for better rates.": "बेहतर दरों के लिए सदस्यों की उपज को थोक लॉट में इकट्ठा करें।",
    "Saving...": "सहेजा जा रहा है...",
    "e.g. ramesh_farms": "उदा. ramesh_farms",
    "Continue to Dashboard": "डैशबोर्ड पर जाएँ",
    "Forecast Horizon": "पूर्वानुमान अवधि",
    "Arrival Volume Pressure": "आवक का दबाव",
    "Predicted Price / qtl": "अनुमानित भाव / क्विंटल",
    "Modal Price / qtl": "मॉडल भाव / क्विंटल",
    "Confidence Band: 95% CI": "विश्वास अंतराल: 95% CI",
    "Live Capacity Occupancy": "लाइव क्षमता उपयोग",
    "Deposit & Pledge Loan →": "जमा करें और गिरवी ऋण लें →",
    "Tenure (Months)": "अवधि (महीने)",
    "3 Months (Recommended for Lean Season)": "3 महीने (कम आवक के मौसम के लिए सुझाया गया)",
    "Disbursement Speed": "भुगतान की गति",
    "🚚 Shared Freight Route Calculator": "🚚 साझा ढुलाई मार्ग कैलकुलेटर",
    "Origin District": "शुरुआती ज़िला",
    "Standard Solo": "सामान्य (अकेले)",
    "Verified WDRA Cold Storages & Scientific Silos": "सत्यापित WDRA कोल्ड स्टोरेज और वैज्ञानिक साइलो",
    "Rain chance {pct}% today": "आज बारिश की संभावना {pct}%",
    "Search by crop, variety, or district…": "फ़सल, किस्म या ज़िले के नाम से खोजें…",
    "Variety": "किस्म",
    "Asking Price (₹/kg)": "मांगी गई कीमत (₹/किलो)",
    "Publishing…": "प्रकाशित हो रहा है…",
    "Mediate Dispute": "मध्यस्थता करें",
    "Raised by: {name} ({type})": "{name} ({type}) ने दर्ज किया",
    "Resolved At: {date}": "{date} को हल हुआ",
    "Could not accept offer: {reason}": "प्रस्ताव स्वीकार नहीं हो सका: {reason}",
    "Subsidized Interest": "रियायती ब्याज",
    "Mentioned": None,
}
for phrase, text in HI.items():
    if text:
        GLOSSARY.setdefault(phrase, {})["hi"] = text

# Word-level clean-ups applied to machine output (and the Hindi seed): spelled-out unit abbreviations
# and stiff or wrong terms that recur across many sentences.  (regex, replacement)
REPLACE = {
    "hi": [("कूटशब्द", "पासवर्ड"), ("संजाल", "नेटवर्क"), ("प्रतिज्ञा", "गिरवी"), ("किलोग्राम", "किलो"), ("किग्रा", "किलो"),
           (r"क्यू\. ?टी\. ?एल\.?", "क्विंटल"), ("क्यूटीएल", "क्विंटल"), ("कुंतल", "क्विंटल"), ("सब्सिडी वाला", "रियायती"), ("मील का पत्थर", "चरण")],
    "mr": [("संकेतशब्द", "पासवर्ड"), (r"क्यू\. ?टी\. ?एल\.?", "क्विंटल"), ("क्यूटीएल", "क्विंटल"), ("किलोग्रॅम", "किलो")],
    "gu": [(r"ક્યુ\. ?ટી\. ?એલ\.?", "ક્વિન્ટલ"), ("ક્યુટીએલ", "ક્વિન્ટલ"), ("કિલોગ્રામ", "કિલો")],
    "pa": [(r"ਕਿਊ\. ?ਟੀ\. ?ਐਲ\.?", "ਕੁਇੰਟਲ"), ("ਕਿਊਟੀਐੱਲ", "ਕੁਇੰਟਲ"), ("ਕਿਲੋਗ੍ਰਾਮ", "ਕਿਲੋ")],
    "te": [(r"క్యూ\. ?టి\. ?ఎల్", "క్వింటాల్"), ("క్యూటిఎల్", "క్వింటాల్"), ("కిలోగ్రాములు", "కిలో"), ("కిలోలు", "కిలో"), ("సంకేతపదం", "పాస్‌వర్డ్")],
    "ta": [(r"க்யூ\. ?டி\. ?எல்", "குவிண்டால்"), ("க்யூடிஎல்", "குவிண்டால்"), ("கிலோகிராம்", "கிலோ")],
    "bn": [(r"কিউ\. ?টি\. ?এল", "কুইন্টাল"), ("কিউটিএল", "কুইন্টাল"), ("কিলোগ্রাম", "কেজি")],
}


def fix(lang, mapping):
    for phrase, text in mapping.items():
        GLOSSARY.setdefault(phrase, {})[lang] = text


fix("mr", {
    "Net in hand": "हातात येणारी रक्कम",
    "✓ PASS": "✓ उत्तीर्ण",
    "✓ PASS (Grade A Spec)": "✓ उत्तीर्ण (श्रेणी अ निकष)",
    "✓ UNIFORM": "✓ एकसमान",
    "Foreign Matter": "परकीय पदार्थ",
    "Foreign Matter (%)": "परकीय पदार्थ (%)",
    "Best match": "सर्वात योग्य",
    "Quoted price": "सांगितलेली किंमत",
    "Grade A": "श्रेणी अ", "Grade B": "श्रेणी ब", "Grade C": "श्रेणी क",
    "Grade A (Export)": "श्रेणी अ (निर्यात)", "Grade B (Wholesale)": "श्रेणी ब (घाऊक)", "Grade C (Local Processing)": "श्रेणी क (स्थानिक प्रक्रिया)",
    "Grade A (Aggregated Bulk)": "श्रेणी अ (एकत्रित मोठा साठा)",
    "Grade A (Export / Premium)": "श्रेणी अ (निर्यात / प्रीमियम)",
    "Grade B (Domestic Wholesale / Food Grade)": "श्रेणी ब (देशांतर्गत घाऊक / खाद्य दर्जा)",
    "Grade C (Processing / Feed Grade)": "श्रेणी क (प्रक्रिया / पशुखाद्य दर्जा)",
    "Scientific Grain Storage Silos": "वैज्ञानिक धान्य साठवण सायलो",
    "Ambient / Aerated": "सामान्य तापमान / हवेशीर",
    "Stabilizing": "स्थिर होत आहे",
    "Lean Season Spike": "कमी आवकेच्या हंगामात वाढ",
    "High Arrivals": "आवक जास्त",
    "Kadi Cotton Yard": "कडी कापूस यार्ड",
    "Drizzle": "रिमझिम पाऊस",
    "Mostly clear": "बहुतांश निरभ्र",
    "Thunderstorm": "विजांसह वादळ",
    "Listening to your voice…": "तुमचा आवाज ऐकत आहे…",
    "Speaking response…": "उत्तर बोलून दाखवत आहे…",
    "Suggested Inquiries:": "सुचवलेले प्रश्न:",
    "Advisory Response:": "सल्ला:",
    "Required volume": "आवश्यक प्रमाण",
    "Nearby Mandi Arbitrage": "जवळच्या मंडीतील दरफरकाचा फायदा",
    "My Listings": "माझ्या नोंदी",
    "Create New Listing": "नवीन नोंद तयार करा",
    "Track Shipment": "मालाचा मागोवा घ्या",
    "AI POWERED": "AI आधारित",
    "Modal price": "मॉडल भाव",
    "Loading price trend…": "किंमतीचा कल लोड होत आहे…",
    "Loading live requirements...": "थेट गरजा लोड होत आहेत...",
    "Change": "बदल",
    "Analyzing Grain Defect Vectors…": "धान्यातील दोषांचे विश्लेषण सुरू आहे…",
    "Grain Kernel Diameter": "दाण्याचा व्यास",
    "Moisture Content": "आर्द्रतेचे प्रमाण",
    "{pct}% AI Confidence": "{pct}% AI विश्वास पातळी",
    "price change pct": "किंमत बदल (%)",
    "rain probability pct": "पावसाची शक्यता (%)",
    "price volatility 30d": "किंमतीतील चढउतार (30 दिवस)",
    "quantity kg": "प्रमाण (किलो)",
    "storage capacity kg": "साठवण क्षमता (किलो)",
    "distance to nearest buyer km": "जवळच्या खरेदीदारापर्यंत अंतर (किमी)",
    "transport cost per kg": "वाहतूक खर्च (प्रति किलो)",
    "storage cost per kg": "साठवण खर्च (प्रति किलो)",
    "Gate Quality Verified": "गेटवर गुणवत्ता तपासली",
    "Quality gate verified": "गेटवर गुणवत्ता तपासली",
    "Buyer Escrow Funded": "खरेदीदाराने एस्क्रोमध्ये रक्कम जमा केली",
})

fix("gu", {
    "Net in hand": "હાથમાં આવતી રકમ",
    "✓ PASS": "✓ ઉત્તીર્ણ",
    "✓ PASS (Grade A Spec)": "✓ ઉત્તીર્ણ (ગ્રેડ એ ધોરણ)",
    "✓ UNIFORM": "✓ એકસરખું",
    "Foreign Matter": "વિદેશી પદાર્થ",
    "Foreign Matter (%)": "વિદેશી પદાર્થ (%)",
    "Best match": "સૌથી યોગ્ય",
    "Quoted price": "જણાવેલી કિંમત",
    "Good Morning": "શુભ સવાર",
    "Checking weather": "હવામાન તપાસી રહ્યા છીએ",
    "Checking forecast": "આગાહી તપાસી રહ્યા છીએ",
    "Interpreting your voice...": "તમારો અવાજ સમજી રહ્યા છીએ...",
    "Listening to your voice…": "તમારો અવાજ સાંભળી રહ્યા છીએ…",
    "Speaking response…": "જવાબ બોલાઈ રહ્યો છે…",
    "Nearby Mandi Arbitrage": "નજીકની મંડીઓમાં ભાવ તફાવતનો લાભ",
    "Avg Freight Cost": "સરેરાશ ભાડું ખર્ચ",
    "Track Shipment": "માલનો ટ્રેક કરો",
    "Raise Grievance": "ફરિયાદ નોંધાવો",
    "AI POWERED": "AI આધારિત",
    "Change": "ફેરફાર",
    "Required volume": "જરૂરી જથ્થો",
    "Grain Kernel Diameter": "દાણાનો વ્યાસ",
    "Analyzing Grain Defect Vectors…": "અનાજની ખામીઓનું વિશ્લેષણ ચાલુ છે…",
    "My Listings": "મારા લિસ્ટિંગ",
    "Create New Listing": "નવું લિસ્ટિંગ બનાવો",
    "price change pct": "કિંમતમાં ફેરફાર (%)",
    "rain probability pct": "વરસાદની સંભાવના (%)",
    "price volatility 30d": "ભાવની અસ્થિરતા (30 દિવસ)",
    "quantity kg": "જથ્થો (કિલો)",
    "storage capacity kg": "સંગ્રહ ક્ષમતા (કિલો)",
    "distance to nearest buyer km": "નજીકના ખરીદનાર સુધીનું અંતર (કિમી)",
    "transport cost per kg": "પરિવહન ખર્ચ (પ્રતિ કિલો)",
    "storage cost per kg": "સંગ્રહ ખર્ચ (પ્રતિ કિલો)",
    "Stabilizing": "સ્થિર થઈ રહ્યું છે",
    "Lean Season Spike": "ઓછી આવકની મોસમમાં ઉછાળો",
    "High Arrivals": "આવક વધુ",
    "Gate Quality Verified": "ગેટ પર ગુણવત્તા ચકાસાઈ",
    "Quality gate verified": "ગેટ પર ગુણવત્તા ચકાસાઈ",
    "Buyer Escrow Funded": "ખરીદનારે એસ્ક્રોમાં રકમ જમા કરી",
    "Funds escrowed": "એસ્ક્રોમાં રકમ જમા",
    "Ready for pickup": "ઉપાડવા માટે તૈયાર",
    "Quality passed": "ગુણવત્તા પાસ",
    "Payout disbursed": "ચૂકવણી થઈ ગઈ",
    "Ready for disbursement": "ચૂકવણી માટે તૈયાર",
    "Offer submitted": "પ્રસ્તાવ રજૂ કર્યો",
    "Disputed": "વિવાદિત",
    "Recently posted": "તાજેતરમાં પોસ્ટ કર્યું",
    "Modal price": "મોડલ ભાવ",
    "Loading live requirements...": "લાઇવ જરૂરિયાતો લોડ થઈ રહી છે...",
    "Ambient / Aerated": "સામાન્ય તાપમાન / હવાદાર",
    "Drizzle": "ઝરમર વરસાદ",
    "Mostly clear": "મોટે ભાગે સ્વચ્છ",
})
REPLACE["gu"].append(("જીવંત", "લાઇવ"))
REPLACE["mr"].append(("जिवंत", "लाइव्ह"))

# ---------------------------------------------------------------- stray NMT artefacts shared by all languages
for _lang in LANGS:
    GLOSSARY.setdefault("Search anything... (crop, mandi, price, etc.)", {})
GLOSSARY["Search anything... (crop, mandi, price, etc.)"].update({
    "mr": "काहीही शोधा... (पीक, मंडी, किंमत इ.)",
    "gu": "કંઈપણ શોધો... (પાક, મંડી, કિંમત વગેરે)",
    "pa": "ਕੁਝ ਵੀ ਲੱਭੋ... (ਫਸਲ, ਮੰਡੀ, ਕੀਮਤ ਆਦਿ)",
    "te": "ఏదైనా వెతకండి... (పంట, మండి, ధర మొదలైనవి)",
    "ta": "எதையும் தேடுங்கள்... (பயிர், மண்டி, விலை போன்றவை)",
    "bn": "যেকোনো কিছু খুঁজুন... (ফসল, মান্ডি, দাম ইত্যাদি)",
})

row("₹{amount}L", "₹{amount} लाख", "₹{amount} लाख", "₹{amount} લાખ", "₹{amount} ਲੱਖ", "₹{amount} లక్షలు", "₹{amount} லட்சம்", "₹{amount} লক্ষ")

fix("pa", {
    "Interpreting your voice...": "ਤੁਹਾਡੀ ਆਵਾਜ਼ ਸਮਝੀ ਜਾ ਰਹੀ ਹੈ...",
    "Listening to your voice…": "ਤੁਹਾਡੀ ਆਵਾਜ਼ ਸੁਣੀ ਜਾ ਰਹੀ ਹੈ…",
    "Speaking response…": "ਜਵਾਬ ਬੋਲਿਆ ਜਾ ਰਿਹਾ ਹੈ…",
    "Suggested Inquiries:": "ਸੁਝਾਏ ਗਏ ਸਵਾਲ:",
    "Loading live requirements...": "ਲਾਈਵ ਲੋੜਾਂ ਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ...",
    "Required volume": "ਲੋੜੀਂਦੀ ਮਾਤਰਾ",
    "Nearby Mandi Arbitrage": "ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਦੇ ਭਾਅ ਦਾ ਫ਼ਰਕ",
    "📍 Nearby Mandi Arbitrage": "📍 ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਦੇ ਭਾਅ ਦਾ ਫ਼ਰਕ",
    "My Listings": "ਮੇਰੀਆਂ ਲਿਸਟਿੰਗਾਂ",
    "Create New Listing": "ਨਵੀਂ ਲਿਸਟਿੰਗ ਬਣਾਓ",
    "Checking weather": "ਮੌਸਮ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ",
    "Checking forecast": "ਪੂਰਵ-ਅਨੁਮਾਨ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ",
    "Loading price trend…": "ਕੀਮਤ ਦਾ ਰੁਝਾਨ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    "Loading your account…": "ਤੁਹਾਡਾ ਖਾਤਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    "Modal price": "ਮਾਡਲ ਭਾਅ",
    "Track Shipment": "ਮਾਲ ਦੀ ਟਰੈਕਿੰਗ",
    "Raise Grievance": "ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ",
    "Check Mandi Prices": "ਮੰਡੀ ਦੇ ਭਾਅ ਵੇਖੋ",
    "Reload page": "ਸਫ਼ਾ ਦੁਬਾਰਾ ਲੋਡ ਕਰੋ",
    "Best match": "ਸਭ ਤੋਂ ਢੁਕਵਾਂ",
    "Quoted price": "ਦੱਸੀ ਗਈ ਕੀਮਤ",
    "Net in hand": "ਹੱਥ ਵਿੱਚ ਆਉਣ ਵਾਲੀ ਰਕਮ",
    "Moisture Content (%)": "ਨਮੀ ਦੀ ਮਾਤਰਾ (%)",
    "Moisture Content": "ਨਮੀ ਦੀ ਮਾਤਰਾ",
    "Foreign Matter": "ਬਾਹਰੀ ਪਦਾਰਥ",
    "Foreign Matter (%)": "ਬਾਹਰੀ ਪਦਾਰਥ (%)",
    "✓ PASS": "✓ ਪਾਸ",
    "✓ UNIFORM": "✓ ਇਕਸਾਰ",
    "✓ PASS (Grade A Spec)": "✓ ਪਾਸ (ਗ੍ਰੇਡ ਏ ਮਿਆਰ)",
    "Grain Kernel Diameter": "ਦਾਣੇ ਦਾ ਵਿਆਸ",
    "Analyzing Grain Defect Vectors…": "ਅਨਾਜ ਦੇ ਨੁਕਸਾਂ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ…",
    "Print / Save PDF": "ਪ੍ਰਿੰਟ / PDF ਸੰਭਾਲੋ",
    "Drizzle": "ਹਲਕੀ ਬੂੰਦਾਬਾਂਦੀ",
    "Rain": "ਮੀਂਹ",
    "Rain showers": "ਮੀਂਹ ਦੀਆਂ ਫੁਹਾਰਾਂ",
    "Thunderstorm": "ਗਰਜ ਨਾਲ ਤੂਫ਼ਾਨ",
    "Mostly clear": "ਜ਼ਿਆਦਾਤਰ ਸਾਫ਼",
    "Foggy": "ਧੁੰਦ",
    "Partly cloudy": "ਕੁਝ ਬੱਦਲਵਾਈ",
    "Overcast": "ਪੂਰੀ ਬੱਦਲਵਾਈ",
    "Cloudy": "ਬੱਦਲਵਾਈ",
    "price change pct": "ਕੀਮਤ ਵਿੱਚ ਤਬਦੀਲੀ (%)",
    "rain probability pct": "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ (%)",
    "price volatility 30d": "ਕੀਮਤ ਵਿੱਚ ਉਤਾਰ-ਚੜ੍ਹਾਅ (30 ਦਿਨ)",
    "quantity kg": "ਮਾਤਰਾ (ਕਿਲੋ)",
    "storage capacity kg": "ਭੰਡਾਰਨ ਸਮਰੱਥਾ (ਕਿਲੋ)",
    "distance to nearest buyer km": "ਨੇੜਲੇ ਖਰੀਦਦਾਰ ਤੱਕ ਦੂਰੀ (ਕਿਮੀ)",
    "transport cost per kg": "ਢੋਆ-ਢੁਆਈ ਲਾਗਤ (ਪ੍ਰਤੀ ਕਿਲੋ)",
    "storage cost per kg": "ਭੰਡਾਰਨ ਲਾਗਤ (ਪ੍ਰਤੀ ਕਿਲੋ)",
    "Stabilizing": "ਸਥਿਰ ਹੋ ਰਿਹਾ",
    "STABLE": "ਸਥਿਰ",
    "Lean Season Spike": "ਘੱਟ ਆਮਦ ਦੇ ਮੌਸਮ ਵਿੱਚ ਉਛਾਲ",
    "High Arrivals": "ਆਮਦ ਵੱਧ",
    "UPWARD": "ਉੱਪਰ ਵੱਲ",
    "DOWNWARD": "ਹੇਠਾਂ ਵੱਲ",
    "Gate Quality Verified": "ਗੇਟ ’ਤੇ ਗੁਣਵੱਤਾ ਦੀ ਜਾਂਚ ਹੋਈ",
    "Quality gate verified": "ਗੇਟ ’ਤੇ ਗੁਣਵੱਤਾ ਦੀ ਜਾਂਚ ਹੋਈ",
    "Buyer Escrow Funded": "ਖਰੀਦਦਾਰ ਨੇ ਐਸਕਰੋ ਵਿੱਚ ਰਕਮ ਜਮ੍ਹਾਂ ਕੀਤੀ",
    "Funds escrowed": "ਐਸਕਰੋ ਵਿੱਚ ਰਕਮ ਜਮ੍ਹਾਂ",
    "Quality passed": "ਗੁਣਵੱਤਾ ਪਾਸ",
    "Payout disbursed": "ਭੁਗਤਾਨ ਹੋ ਗਿਆ",
    "Verified": "ਤਸਦੀਕਸ਼ੁਦਾ",
    "Mediate Dispute": "ਵਿਚੋਲਗੀ ਕਰੋ",
    "Could not advance milestone": "ਅਗਲੇ ਪੜਾਅ ’ਤੇ ਨਹੀਂ ਜਾ ਸਕੇ",
    "Could not load invoice": "ਚਲਾਨ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ",
    "Post Bulk Procurement Requirement": "ਥੋਕ ਖਰੀਦ ਦੀ ਲੋੜ ਪੋਸਟ ਕਰੋ",
    "Broadcasting Requirement…": "ਲੋੜ ਪੋਸਟ ਹੋ ਰਹੀ ਹੈ…",
    "+ Broadcast Requirement": "+ ਲੋੜ ਪੋਸਟ ਕਰੋ",
    "Stage {n} of 4": "ਪੜਾਅ {n} / 4",
    "Quality Spec: {grade}": "ਗੁਣਵੱਤਾ ਮਿਆਰ: {grade}",
    "{count} Active Escrow Orders": "{count} ਸਰਗਰਮ ਐਸਕਰੋ ਆਰਡਰ",
    "Target Crop": "ਲੋੜੀਂਦੀ ਫਸਲ",
    "Target Sourcing District": "ਖਰੀਦ ਲਈ ਜ਼ਿਲ੍ਹਾ",
    "Escrow Value": "ਐਸਕਰੋ ਰਕਮ",
    "Running ML Models…": "ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ…",
    "Updating Prices…": "ਕੀਮਤਾਂ ਅੱਪਡੇਟ ਹੋ ਰਹੀਆਂ ਹਨ…",
    "FPOs Onboarded": "ਸ਼ਾਮਲ FPO",
    "Live Produce Lots": "ਲਾਈਵ ਉਪਜ ਦੇ ਲਾਟ",
    "Lean": "ਘੱਟ",
})

fix("te", {
    "Ref.": "సూచన",
    "Checking weather": "వాతావరణం తనిఖీ అవుతోంది",
    "Checking forecast": "అంచనా తనిఖీ అవుతోంది",
    "Interpreting your voice...": "మీ గొంతును అర్థం చేసుకుంటున్నాం...",
    "Listening to your voice…": "మీ గొంతు వింటున్నాం…",
    "Speaking response…": "సమాధానం చదవబడుతోంది…",
    "Suggested Inquiries:": "సూచించిన ప్రశ్నలు:",
    "Nearby Mandi Arbitrage": "సమీప మండీల ధరల వ్యత్యాస లాభం",
    "📍 Nearby Mandi Arbitrage": "📍 సమీప మండీల ధరల వ్యత్యాస లాభం",
    "My Listings": "నా లిస్టింగ్‌లు",
    "Create New Listing": "కొత్త లిస్టింగ్ సృష్టించండి",
    "Track Shipment": "రవాణాను ట్రాక్ చేయండి",
    "Raise Grievance": "ఫిర్యాదు నమోదు చేయండి",
    "Main": "ప్రధాన",
    "Best match": "అత్యంత అనుకూలం",
    "Net in hand": "చేతికి వచ్చే మొత్తం",
    "Moisture Content": "తేమ శాతం",
    "Moisture Content (%)": "తేమ శాతం (%)",
    "Foreign Matter": "ఇతర పదార్థాలు",
    "Foreign Matter (%)": "ఇతర పదార్థాలు (%)",
    "✓ PASS": "✓ ఉత్తీర్ణత",
    "✓ UNIFORM": "✓ ఏకరీతి",
    "✓ PASS (Grade A Spec)": "✓ ఉత్తీర్ణత (గ్రేడ్ ఎ ప్రమాణం)",
    "Grain Kernel Diameter": "గింజ వ్యాసం",
    "Mostly clear": "చాలావరకు నిర్మలం",
    "Cloudy": "మేఘావృతం",
    "Overcast": "పూర్తిగా మేఘావృతం",
    "price change pct": "ధర మార్పు (%)",
    "rain probability pct": "వర్ష సంభావ్యత (%)",
    "price volatility 30d": "ధరల ఒడిదుడుకులు (30 రోజులు)",
    "quantity kg": "పరిమాణం (కిలో)",
    "storage capacity kg": "నిల్వ సామర్థ్యం (కిలో)",
    "distance to nearest buyer km": "సమీప కొనుగోలుదారుకు దూరం (కి.మీ)",
    "transport cost per kg": "రవాణా ఖర్చు (కిలోకు)",
    "storage cost per kg": "నిల్వ ఖర్చు (కిలోకు)",
    "Stabilizing": "స్థిరపడుతోంది",
    "Lean Season Spike": "తక్కువ రాక సీజన్‌లో పెరుగుదల",
    "High Arrivals": "మార్కెట్‌కు రాక ఎక్కువ",
    "Gate Quality Verified": "గేటు వద్ద నాణ్యత ధృవీకరణ",
    "Quality gate verified": "గేటు వద్ద నాణ్యత ధృవీకరణ",
    "Buyer Escrow Funded": "కొనుగోలుదారు ఎస్క్రోలో మొత్తం జమ చేశారు",
    "Funds escrowed": "ఎస్క్రోలో మొత్తం జమ",
    "Quality passed": "నాణ్యత ఆమోదం",
    "Payout disbursed": "చెల్లింపు పూర్తయింది",
    "Ready for disbursement": "చెల్లింపునకు సిద్ధం",
    "Mediate Dispute": "మధ్యవర్తిత్వం చేయండి",
    "Could not advance milestone": "తదుపరి దశకు వెళ్లలేకపోయాం",
    "Could not load invoice": "ఇన్వాయిస్ లోడ్ కాలేదు",
    "Could not submit counter-offer": "కౌంటర్ ఆఫర్ పంపలేకపోయాం",
    "Post Bulk Procurement Requirement": "భారీ కొనుగోలు అవసరాన్ని పోస్ట్ చేయండి",
    "Broadcasting Requirement…": "అవసరం పోస్ట్ అవుతోంది…",
    "+ Broadcast Requirement": "+ అవసరాన్ని పోస్ట్ చేయండి",
    "Stage {n} of 4": "దశ {n} / 4",
    "FPOs Onboarded": "చేరిన FPOలు",
    "Live Produce Lots": "ప్రత్యక్ష ఉత్పత్తి లాట్లు",
    "Variety": "రకం",
    "Asking Price (₹/kg)": "కోరిన ధర (₹/కిలో)",
    "Harvest Status": "పంట కోత స్థితి",
    "True In-Hand / qtl": "చేతికి వచ్చే నికర ధర / క్వింటాల్",
    "Total In-Hand Amount": "చేతికి వచ్చే మొత్తం",
    "+₹{amount} In-Hand": "+₹{amount} చేతికి",
    "Gross Price / qtl": "స్థూల ధర / క్వింటాల్",
    "Running ML Models…": "విశ్లేషణ జరుగుతోంది…",
    "Updating Prices…": "ధరలు నవీకరించబడుతున్నాయి…",
    "Loading live requirements...": "ప్రత్యక్ష అవసరాలు లోడ్ అవుతున్నాయి...",
})

fix("ta", {
    "Ref.": "குறிப்பு",
    "Nearby Mandi Arbitrage": "அருகிலுள்ள மண்டிகளில் விலை வித்தியாச லாபம்",
    "📍 Nearby Mandi Arbitrage": "📍 அருகிலுள்ள மண்டிகளில் விலை வித்தியாச லாபம்",
    "Net in hand": "கைக்கு வரும் தொகை",
    "Track Shipment": "சரக்கை கண்காணிக்கவும்",
    "Raise Grievance": "புகார் பதிவு செய்யவும்",
    "Main": "முதன்மை",
    "Best match": "மிகப் பொருத்தமானது",
    "Foreign Matter": "அந்நியப் பொருள்",
    "✓ PASS": "✓ தேர்ச்சி",
    "✓ PASS (Grade A Spec)": "✓ தேர்ச்சி (தரம் ஏ தரநிலை)",
    "✓ UNIFORM": "✓ ஒரே சீரானது",
    "Moisture Content": "ஈரப்பதம்",
    "Processor": "பதப்படுத்துபவர்",
    "Food Processor": "உணவு பதப்படுத்துபவர்",
    "Grade A (Aggregated Bulk)": "தரம் ஏ (திரட்டிய மொத்த அளவு)",
    "🔒 Escrow: {status}": "🔒 எஸ்க்ரோ: {status}",
    "Est: ₹{amount}": "மதிப்பீடு: ₹{amount}",
    "{count} Active Escrow Orders": "செயலில் உள்ள {count} எஸ்க்ரோ ஆர்டர்கள்",
    "Stage {n} of 4": "நிலை {n} / 4",
    "No price available": "விலை கிடைக்கவில்லை",
    "Welcome to KisanSetu": "KisanSetu-வுக்கு வரவேற்கிறோம்",
    "Welcome, {name}": "வரவேற்கிறோம், {name}",
    "Variety": "ரகம்",
    "Asking Price (₹/kg)": "கேட்கும் விலை (₹/கிலோ)",
    "Quality Grade": "தரநிலை",
    "Checking weather": "வானிலை சரிபார்க்கப்படுகிறது",
    "Checking forecast": "முன்னறிவிப்பு சரிபார்க்கப்படுகிறது",
    "Listening to your voice…": "உங்கள் குரலைக் கேட்கிறோம்…",
    "Speaking response…": "பதில் வாசிக்கப்படுகிறது…",
    "Suggested Inquiries:": "பரிந்துரைக்கப்பட்ட கேள்விகள்:",
    "Interpreting your voice...": "உங்கள் குரலைப் புரிந்துகொள்கிறோம்...",
    "Create New Listing": "புதிய பட்டியலை உருவாக்கவும்",
    "AI POWERED": "AI அடிப்படையிலானது",
    "price change pct": "விலை மாற்றம் (%)",
    "rain probability pct": "மழை வாய்ப்பு (%)",
    "price volatility 30d": "விலை ஏற்ற இறக்கம் (30 நாள்)",
    "quantity kg": "அளவு (கிலோ)",
    "storage capacity kg": "சேமிப்புத் திறன் (கிலோ)",
    "distance to nearest buyer km": "அருகிலுள்ள வாங்குபவருக்கான தூரம் (கி.மீ)",
    "transport cost per kg": "போக்குவரத்துச் செலவு (கிலோவுக்கு)",
    "storage cost per kg": "சேமிப்புச் செலவு (கிலோவுக்கு)",
    "Stabilizing": "நிலைபெறுகிறது",
    "STABLE": "நிலையானது",
    "Lean Season Spike": "வரத்து குறைந்த பருவத்தில் உயர்வு",
    "High Arrivals": "வரத்து அதிகம்",
    "Gate Quality Verified": "வாயிலில் தரம் சரிபார்க்கப்பட்டது",
    "Quality gate verified": "வாயிலில் தரம் சரிபார்க்கப்பட்டது",
    "Buyer Escrow Funded": "வாங்குபவர் எஸ்க்ரோவில் தொகை செலுத்தினார்",
    "Funds escrowed": "எஸ்க்ரோவில் தொகை வைக்கப்பட்டது",
    "Ready for pickup": "எடுத்துச் செல்லத் தயார்",
    "Quality passed": "தரம் ஏற்கப்பட்டது",
    "Payout disbursed": "பணம் வழங்கப்பட்டது",
    "Mediate Dispute": "மத்தியஸ்தம் செய்யவும்",
    "Could not advance milestone": "அடுத்த நிலைக்குச் செல்ல முடியவில்லை",
    "Post Bulk Procurement Requirement": "மொத்த கொள்முதல் தேவையை இடுகையிடவும்",
    "Broadcasting Requirement…": "தேவை இடுகையிடப்படுகிறது…",
    "+ Broadcast Requirement": "+ தேவையை இடுகையிடவும்",
    "Posting as {name} ({category})": "{name} ({category}) ஆக இடுகையிடுகிறீர்கள்",
    "FPOs Onboarded": "இணைந்த FPO-க்கள்",
    "Live Produce Lots": "நேரடி விளைபொருள் லாட்டுகள்",
    "True In-Hand / qtl": "கைக்கு வரும் நிகர விலை / குவிண்டால்",
    "+₹{amount} In-Hand": "+₹{amount} கைக்கு",
    "Total In-Hand Amount": "கைக்கு வரும் மொத்தத் தொகை",
    "Running ML Models…": "பகுப்பாய்வு நடைபெறுகிறது…",
    "Updating Prices…": "விலைகள் புதுப்பிக்கப்படுகின்றன…",
    "Publishing…": "வெளியிடப்படுகிறது…",
})

fix("bn", {
    "Ref.": "সূত্র",
    "Nearby Mandi Arbitrage": "নিকটবর্তী মান্ডিতে দামের ব্যবধানের সুবিধা",
    "📍 Nearby Mandi Arbitrage": "📍 নিকটবর্তী মান্ডিতে দামের ব্যবধানের সুবিধা",
    "Net in hand": "হাতে পাওয়া অর্থ",
    "Track Shipment": "চালান ট্র্যাক করুন",
    "Raise Grievance": "অভিযোগ জানান",
    "Best match": "সবচেয়ে উপযুক্ত",
    "Quoted price": "উল্লিখিত দাম",
    "Foreign Matter": "বাইরের পদার্থ",
    "Foreign Matter (%)": "বাইরের পদার্থ (%)",
    "✓ PASS": "✓ উত্তীর্ণ",
    "✓ PASS (Grade A Spec)": "✓ উত্তীর্ণ (গ্রেড এ মান)",
    "✓ UNIFORM": "✓ অভিন্ন",
    "Checking weather": "আবহাওয়া দেখা হচ্ছে",
    "Listening to your voice…": "আপনার কণ্ঠস্বর শোনা হচ্ছে…",
    "Speaking response…": "উত্তর পড়ে শোনানো হচ্ছে…",
    "Suggested Inquiries:": "প্রস্তাবিত প্রশ্ন:",
    "Interpreting your voice...": "আপনার কথা বোঝা হচ্ছে...",
    "Food Processor": "খাদ্য প্রক্রিয়াকারী",
    "Processor": "প্রক্রিয়াকারী",
    "Bulk": "বাল্ক",
    "Est: ₹{amount}": "আনুমানিক: ₹{amount}",
    "Stage {n} of 4": "পর্যায় {n} / 4",
    "Escrow Value": "এসক্রো অর্থমূল্য",
    "Variety": "জাত",
    "Asking Price (₹/kg)": "চাওয়া দাম (₹/কেজি)",
    "Quality Grade": "মানের গ্রেড",
    "Mediate Dispute": "মধ্যস্থতা করুন",
    "Could not advance milestone": "পরবর্তী ধাপে যাওয়া যায়নি",
    "Could not submit counter-offer": "পাল্টা প্রস্তাব জমা দেওয়া যায়নি",
    "Post Bulk Procurement Requirement": "বাল্ক ক্রয়ের চাহিদা পোস্ট করুন",
    "Broadcasting Requirement…": "চাহিদা পোস্ট হচ্ছে…",
    "+ Broadcast Requirement": "+ চাহিদা পোস্ট করুন",
    "Posting as {name} ({category})": "{name} ({category}) হিসেবে পোস্ট করছেন",
    "price change pct": "মূল্য পরিবর্তন (%)",
    "rain probability pct": "বৃষ্টির সম্ভাবনা (%)",
    "price volatility 30d": "দামের ওঠানামা (30 দিন)",
    "days since harvest": "ফসল কাটার পর কত দিন",
    "quantity kg": "পরিমাণ (কেজি)",
    "storage capacity kg": "মজুত ক্ষমতা (কেজি)",
    "distance to nearest buyer km": "নিকটতম ক্রেতার দূরত্ব (কিমি)",
    "transport cost per kg": "পরিবহন খরচ (প্রতি কেজি)",
    "storage cost per kg": "মজুত খরচ (প্রতি কেজি)",
    "has storage": "মজুতের ব্যবস্থা আছে",
    "Stabilizing": "স্থির হচ্ছে",
    "STABLE": "স্থির",
    "Lean Season Spike": "কম আমদানির মৌসুমে দাম বৃদ্ধি",
    "High Arrivals": "আমদানি বেশি",
    "Gate Quality Verified": "গেটে মান যাচাই হয়েছে",
    "Quality gate verified": "গেটে মান যাচাই হয়েছে",
    "Buyer Escrow Funded": "ক্রেতা এসক্রোতে অর্থ জমা দিয়েছেন",
    "Funds escrowed": "এসক্রোতে অর্থ জমা",
    "Quality passed": "মান উত্তীর্ণ",
    "Payout disbursed": "অর্থ প্রদান সম্পন্ন",
    "Payout Released to Farmer": "কৃষককে অর্থ ছাড়",
    "FPOs Onboarded": "যুক্ত FPO",
    "Live Produce Lots": "চালু পণ্যের লট",
    "True In-Hand / qtl": "হাতে পাওয়া প্রকৃত দাম / কুইন্টাল",
    "Total In-Hand Amount": "হাতে পাওয়া মোট অর্থ",
    "+₹{amount} In-Hand": "+₹{amount} হাতে",
    "Running ML Models…": "বিশ্লেষণ চলছে…",
    "Publishing…": "প্রকাশ করা হচ্ছে…",
    "Available On-Farm Storage (kg)": "খামারে মজুতের জায়গা (কেজি)",
    "Welcome to KisanSetu": "KisanSetu-তে স্বাগতম",
    "Thunderstorm": "বজ্রসহ ঝড়",
    "Rain showers": "বৃষ্টির ঝাপটা",
    "Drizzle": "গুঁড়ি গুঁড়ি বৃষ্টি",
    "Mostly clear": "প্রায় পরিষ্কার",
    "Grade A (Aggregated Bulk)": "গ্রেড এ (একত্রিত বাল্ক)",
    "Scientific Grain Storage Silos": "বৈজ্ঞানিক শস্য মজুত সাইলো",
    "Safe storage & transport": "নিরাপদ মজুত ও পরিবহন",
})

# ---------------------------------------------------------------- shared fixes found while reviewing the other pages
def rows(table):
    """table: {phrase: (hi, mr, gu, pa, te, ta, bn)} with None to leave a language alone."""
    for phrase, values in table.items():
        row(phrase, *values)


rows({
    "True In-Hand / qtl": (None, "हातात येणारा खरा दर / क्विंटल", "હાથમાં આવતો ચોખ્ખો ભાવ / ક્વિન્ટલ", "ਹੱਥ ਵਿੱਚ ਆਉਣ ਵਾਲਾ ਸ਼ੁੱਧ ਭਾਅ / ਕੁਇੰਟਲ", None, None, None),
    "Total In-Hand Amount": (None, "हातात येणारी एकूण रक्कम", "હાથમાં આવતી કુલ રકમ", "ਹੱਥ ਵਿੱਚ ਆਉਣ ਵਾਲੀ ਕੁੱਲ ਰਕਮ", None, None, None),
    "+₹{amount} In-Hand": (None, "+₹{amount} हातात", "+₹{amount} હાથમાં", "+₹{amount} ਹੱਥ ਵਿੱਚ", None, None, None),
    "Active Aggregation Lots": ("सक्रिय सामूहिक लॉट", "सक्रिय एकत्रीकरण लॉट", "સક્રિય એકત્રીકરણ લોટ", "ਸਰਗਰਮ ਇਕੱਠੇ ਕੀਤੇ ਲਾਟ", "క్రియాశీల సమీకరణ లాట్లు", "செயலில் உள்ள திரட்டல் லாட்டுகள்", "সক্রিয় একত্রীকরণ লট"),
    "Locking Escrow…": (None, "एस्क्रो लॉक होत आहे…", "એસ્ક્રો લૉક થઈ રહ્યું છે…", "ਐਸਕਰੋ ਲਾਕ ਹੋ ਰਿਹਾ ਹੈ…", "ఎస్క్రో లాక్ అవుతోంది…", "எஸ்க்ரோ பூட்டப்படுகிறது…", "এসক্রো লক হচ্ছে…"),
    "Arrival Volume Pressure": (None, "आवकेचा दबाव", "આવકનું દબાણ", "ਆਮਦ ਦਾ ਦਬਾਅ", "మార్కెట్ రాక ఒత్తిడి", "வரத்து அழுத்தம்", "আমদানির চাপ"),
    "Resolution Rate": ("समाधान दर", "निराकरण दर", "નિરાકરણ દર", "ਹੱਲ ਦੀ ਦਰ", "పరిష్కార రేటు", "தீர்வு விகிதம்", "সমাধানের হার"),
    "Average Resolution": ("औसत समाधान समय", "सरासरी निराकरण वेळ", "સરેરાશ નિરાકરણ સમય", "ਹੱਲ ਦਾ ਔਸਤ ਸਮਾਂ", "సగటు పరిష్కార సమయం", "சராசரி தீர்வு நேரம்", "গড় সমাধানের সময়"),
    "Resolution:": ("समाधान:", "तोडगा:", "ઉકેલ:", "ਹੱਲ:", "పరిష్కారం:", "தீர்வு:", "সমাধান:"),
    "{count} offers": ("{count} प्रस्ताव", "{count} प्रस्ताव", "{count} પ્રસ્તાવ", "{count} ਪੇਸ਼ਕਸ਼ਾਂ", "{count} ఆఫర్లు", "{count} சலுகைகள்", "{count}টি প্রস্তাব"),
    "Qty (kg)": ("मात्रा (किलो)", "प्रमाण (किलो)", "જથ્થો (કિલો)", "ਮਾਤਰਾ (ਕਿਲੋ)", "పరిమాణం (కిలో)", "அளவு (கிலோ)", "পরিমাণ (কেজি)"),
    "Tenure (Months)": (None, "कालावधी (महिने)", "સમયગાળો (મહિના)", "ਮਿਆਦ (ਮਹੀਨੇ)", "కాలవ్యవధి (నెలలు)", "கால அளவு (மாதங்கள்)", "মেয়াদ (মাস)"),
    "Calculating Route…": ("रास्ते की गणना हो रही है…", "मार्ग मोजत आहे…", "માર્ગની ગણતરી ચાલુ છે…", "ਰੂਟ ਦੀ ਗਣਨਾ ਹੋ ਰਹੀ ਹੈ…", "మార్గాన్ని లెక్కిస్తోంది…", "வழி கணக்கிடப்படுகிறது…", "রুট গণনা চলছে…"),
    "Live fetched {time}": (None, "लाइव्ह डेटा मिळाला: {time}", "લાઇવ ડેટા મળ્યો: {time}", "ਲਾਈਵ ਡਾਟਾ ਮਿਲਿਆ: {time}", "ప్రత్యక్ష డేటా అందింది: {time}", "நேரடித் தரவு பெறப்பட்டது: {time}", "লাইভ ডেটা পাওয়া গেছে: {time}"),
    "Hold for 15-30 Days": (None, "15-30 दिवस थांबवून ठेवा", "15-30 દિવસ રોકી રાખો", "15-30 ਦਿਨ ਰੋਕ ਕੇ ਰੱਖੋ", "15-30 రోజులు ఆపి ఉంచండి", "15-30 நாட்கள் வைத்திருங்கள்", "15-30 দিন ধরে রাখুন"),
    "Hold for 30 Days (Lean Season)": (None, "30 दिवस थांबवा (कमी आवकेचा हंगाम)", "30 દિવસ રોકો (ઓછી આવકની મોસમ)", "30 ਦਿਨ ਰੋਕੋ (ਘੱਟ ਆਮਦ ਦਾ ਮੌਸਮ)", "30 రోజులు ఆపండి (తక్కువ రాక సీజన్)", "30 நாட்கள் வைத்திருங்கள் (வரத்து குறைந்த பருவம்)", "30 দিন ধরে রাখুন (কম আমদানির মৌসুম)"),
    "Raised by: {name} ({type})": (None, "{name} ({type}) यांनी नोंदवले", "{name} ({type}) દ્વારા નોંધાવેલ", "{name} ({type}) ਵੱਲੋਂ ਦਰਜ", "{name} ({type}) నమోదు చేశారు", "பதிவு செய்தவர்: {name} ({type})", "{name} ({type}) জানিয়েছেন"),
    "against {name}": (None, "{name} विरुद्ध", "{name} વિરુદ્ધ", "{name} ਦੇ ਵਿਰੁੱਧ", "{name} పై", "{name} மீது", "{name}-এর বিরুদ্ধে"),
    "Resolved At: {date}": (None, "निराकरण तारीख: {date}", "ઉકેલ તારીખ: {date}", "ਹੱਲ ਦੀ ਤਾਰੀਖ਼: {date}", "పరిష్కార తేదీ: {date}", "தீர்வு தேதி: {date}", "সমাধানের তারিখ: {date}"),
    "Error submitting offer: {reason}": ("प्रस्ताव भेजने में त्रुटि: {reason}", "प्रस्ताव सादर करता आला नाही: {reason}", "પ્રસ્તાવ મોકલી શકાયો નહીં: {reason}", "ਪੇਸ਼ਕਸ਼ ਭੇਜੀ ਨਹੀਂ ਜਾ ਸਕੀ: {reason}", "ఆఫర్ పంపడంలో లోపం: {reason}", "சலுகையை அனுப்ப முடியவில்லை: {reason}", "প্রস্তাব জমা দেওয়া যায়নি: {reason}"),
    "Could not accept offer: {reason}": (None, "प्रस्ताव स्वीकारता आला नाही: {reason}", "પ્રસ્તાવ સ્વીકારી શકાયો નહીં: {reason}", "ਪੇਸ਼ਕਸ਼ ਸਵੀਕਾਰ ਨਹੀਂ ਹੋ ਸਕੀ: {reason}", "ఆఫర్‌ను అంగీకరించలేకపోయాం: {reason}", "சலுகையை ஏற்க முடியவில்லை: {reason}", "প্রস্তাব গ্রহণ করা যায়নি: {reason}"),
    "Forecast Horizon": (None, "अंदाज कालावधी", "આગાહીનો સમયગાળો", "ਪੂਰਵ-ਅਨੁਮਾਨ ਦੀ ਮਿਆਦ", "అంచనా కాలం", "முன்னறிவிப்பு காலம்", "পূর্বাভাসের সময়কাল"),
    "Live Capacity Occupancy": (None, "थेट क्षमता वापर", "લાઇવ ક્ષમતા ઉપયોગ", "ਲਾਈਵ ਸਮਰੱਥਾ ਵਰਤੋਂ", "ప్రస్తుత సామర్థ్య వినియోగం", "நேரடி கொள்ளளவு பயன்பாடு", "লাইভ ধারণক্ষমতা ব্যবহার"),
    "Standard Solo": (None, "सामान्य (एकट्याने)", "સામાન્ય (એકલા)", "ਆਮ (ਇਕੱਲੇ)", "సాధారణ (ఒంటరిగా)", "வழக்கமான (தனியாக)", "সাধারণ (একা)"),
    "Extra vs Mandi": ("मंडी से ज़्यादा", "मंडीच्या तुलनेत अतिरिक्त", "મંડીની સરખામણીમાં વધારાનું", "ਮੰਡੀ ਨਾਲੋਂ ਵੱਧ", "మండీ కంటే అదనం", "மண்டியை விட கூடுதல்", "মান্ডির তুলনায় অতিরিক্ত"),
    "Buyer Procurement Portal": ("खरीदार खरीद पोर्टल", None, None, None, None, None, None),
    "💰 e-NWR Post-Harvest Pledge Loan": (None, "💰 e-NWR कापणीनंतर तारण कर्ज", "💰 e-NWR લણણી પછીની ગીરવે લોન", "💰 e-NWR ਵਾਢੀ ਤੋਂ ਬਾਅਦ ਗਿਰਵੀ ਕਰਜ਼ਾ", "💰 e-NWR పంటకోత తర్వాత తాకట్టు రుణం", "💰 e-NWR அறுவடைக்குப் பிந்தைய அடமானக் கடன்", "💰 e-NWR ফসল কাটার পরবর্তী বন্ধকী ঋণ"),
    "Deposit & Pledge Loan →": (None, "ठेवा आणि तारण कर्ज मिळवा →", "જમા કરો અને ગીરવે લોન મેળવો →", "ਜਮ੍ਹਾਂ ਕਰੋ ਅਤੇ ਗਿਰਵੀ ਕਰਜ਼ਾ ਲਓ →", "జమ చేసి తాకట్టు రుణం పొందండి →", "வைப்பு வைத்து அடமானக் கடன் பெறுங்கள் →", "জমা দিন ও বন্ধকী ঋণ নিন →"),
    "💰 Calculate Post-Harvest Pledge Loan": (None, "💰 कापणीनंतरच्या तारण कर्जाची गणना करा", "💰 લણણી પછીની ગીરવે લોનની ગણતરી કરો", "💰 ਵਾਢੀ ਤੋਂ ਬਾਅਦ ਗਿਰਵੀ ਕਰਜ਼ੇ ਦੀ ਗਣਨਾ ਕਰੋ", "💰 పంటకోత తర్వాత తాకట్టు రుణాన్ని లెక్కించండి", "💰 அறுவடைக்குப் பிந்தைய அடமானக் கடனைக் கணக்கிடுங்கள்", "💰 ফসল কাটার পরবর্তী বন্ধকী ঋণ গণনা করুন"),
    "Approved e-NWR Pledge Facility": (None, "मंजूर e-NWR तारण सुविधा", "મંજૂર થયેલ e-NWR ગીરવે સુવિધા", "ਮਨਜ਼ੂਰ ਹੋਈ e-NWR ਗਿਰਵੀ ਸਹੂਲਤ", "ఆమోదించబడిన e-NWR తాకట్టు సౌకర్యం", "அங்கீகரிக்கப்பட்ட e-NWR அடமான வசதி", "অনুমোদিত e-NWR বন্ধকী সুবিধা"),
    "e-NWR electronic pledge application initiated! Verification OTP sent.": (None, "e-NWR इलेक्ट्रॉनिक तारण अर्ज सुरू झाला! पडताळणी OTP पाठवला आहे.", "e-NWR ઇલેક્ટ્રોનિક ગીરવે અરજી શરૂ થઈ! ચકાસણી OTP મોકલાયો છે.", "e-NWR ਇਲੈਕਟ੍ਰੌਨਿਕ ਗਿਰਵੀ ਅਰਜ਼ੀ ਸ਼ੁਰੂ ਹੋ ਗਈ! ਤਸਦੀਕ OTP ਭੇਜਿਆ ਗਿਆ।", "e-NWR ఎలక్ట్రానిక్ తాకట్టు దరఖాస్తు ప్రారంభమైంది! ధృవీకరణ OTP పంపబడింది.", "e-NWR மின்னணு அடமான விண்ணப்பம் தொடங்கப்பட்டது! சரிபார்ப்பு OTP அனுப்பப்பட்டது.", "e-NWR ইলেকট্রনিক বন্ধকী আবেদন শুরু হয়েছে! যাচাইকরণ OTP পাঠানো হয়েছে।"),
    "e-NWR 70% Instant Pledge Financing": (None, "e-NWR 70% तात्काळ तारण वित्तपुरवठा", "e-NWR 70% તાત્કાલિક ગીરવે ધિરાણ", "e-NWR 70% ਤੁਰੰਤ ਗਿਰਵੀ ਵਿੱਤ", "e-NWR 70% తక్షణ తాకట్టు ఫైనాన్సింగ్", "e-NWR 70% உடனடி அடமான நிதியுதவி", "e-NWR 70% তাৎক্ষণিক বন্ধকী অর্থায়ন"),
    "Overcome distress selling with verified warehousing, live occupancy, and post-harvest pledge loans.": (None, None, None, None, "ధృవీకరించబడిన గిడ్డంగులు, ప్రత్యక్ష ఖాళీ వివరాలు మరియు పంటకోత అనంతర తాకట్టు రుణాలతో నష్టానికి అమ్ముకోవాల్సిన పరిస్థితిని అధిగమించండి.", None, None),
})

rows({
    "predicted price 7d": ("अनुमानित कीमत (7 दिन)", "अंदाजित किंमत (7 दिवस)", "અનુમાનિત કિંમત (7 દિવસ)", "ਅਨੁਮਾਨਿਤ ਕੀਮਤ (7 ਦਿਨ)", "అంచనా ధర (7 రోజులు)", "கணிக்கப்பட்ட விலை (7 நாள்)", "আনুমানিক মূল্য (7 দিন)"),
    "expected gain per kg": (None, "प्रति किलो अपेक्षित नफा", "પ્રતિ કિલો અપેક્ષિત નફો", "ਪ੍ਰਤੀ ਕਿਲੋ ਉਮੀਦੀ ਮੁਨਾਫ਼ਾ", "కిలోకు ఆశించిన లాభం", "எதிர்பார்க்கும் லாபம் (கிலோவுக்கு)", "প্রতি কেজি প্রত্যাশিত লাভ"),
})

rows({
    "or": ("या", "किंवा", "અથવા", "ਜਾਂ", "లేదా", "அல்லது", "অথবা"),
    "Continue with Google": ("Google से जारी रखें", "Google ने सुरू ठेवा", "Google સાથે ચાલુ રાખો", "Google ਨਾਲ ਜਾਰੀ ਰੱਖੋ", "Googleతో కొనసాగండి", "Google மூலம் தொடரவும்", "Google দিয়ে চালিয়ে যান"),
    "Signing in with Google...": ("Google से साइन इन हो रहा है...", "Google ने साइन इन होत आहे...", "Google સાથે સાઇન ઇન થઈ રહ્યું છે...", "Google ਨਾਲ ਸਾਈਨ ਇਨ ਹੋ ਰਿਹਾ ਹੈ...", "Googleతో సైన్ ఇన్ అవుతోంది...", "Google மூலம் உள்நுழைகிறது...", "Google দিয়ে সাইন ইন হচ্ছে..."),
})

rows({
    "Edit Profile": ("प्रोफ़ाइल बदलें", "प्रोफाइल संपादित करा", "પ્રોફાઇલ સંપાદિત કરો", "ਪ੍ਰੋਫਾਈਲ ਸੋਧੋ", "ప్రొఫైల్ సవరించండి", "சுயவிவரத்தைத் திருத்து", "প্রোফাইল সম্পাদনা"),
    "Save Changes": ("बदलाव सहेजें", "बदल जतन करा", "ફેરફારો સાચવો", "ਤਬਦੀਲੀਆਂ ਸੰਭਾਲੋ", "మార్పులను సేవ్ చేయండి", "மாற்றங்களைச் சேமி", "পরিবর্তন সংরক্ষণ করুন"),
    "Profile updated.": ("प्रोफ़ाइल अपडेट हो गई।", "प्रोफाइल अद्ययावत झाले.", "પ્રોફાઇલ અપડેટ થઈ.", "ਪ੍ਰੋਫਾਈਲ ਅੱਪਡੇਟ ਹੋ ਗਈ।", "ప్రొఫైల్ నవీకరించబడింది.", "சுயவிவரம் புதுப்பிக்கப்பட்டது.", "প্রোফাইল আপডেট হয়েছে।"),
    "Buyer profile": ("खरीदार प्रोफ़ाइल", "खरेदीदार प्रोफाइल", "ખરીદનાર પ્રોફાઇલ", "ਖਰੀਦਦਾਰ ਪ੍ਰੋਫਾਈਲ", "కొనుగోలుదారు ప్రొఫైల్", "வாங்குபவர் சுயவிவரம்", "ক্রেতার প্রোফাইল"),
    "FPO profile": ("FPO प्रोफ़ाइल", "FPO प्रोफाइल", "FPO પ્રોફાઇલ", "FPO ਪ੍ਰੋਫਾਈਲ", "FPO ప్రొఫైల్", "FPO சுயவிவரம்", "FPO প্রোফাইল"),
})
