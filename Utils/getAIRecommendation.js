const getAIRecommendation = async (req, res, UserPrompt, products) => {
  const Api_key = process.env.GEMINI_API_KEY;
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Api_key}`;
  try {
    const geminiPrompt = `Here is a List of Available products
${JSON.stringify(products, null, 2)}

Based on the following user request, filter and suggest the best matching products:
"${UserPrompt}"
Only return the matching products in JSON format.
`;
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: geminiPrompt }],
          },
        ],
      }),
    });
    const data = await response.json();
    console.log("Gemini Output", data);
    const AiResponse =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const CleanedText = AiResponse.replace(/```json|```/g, "").trim();
    if (!CleanedText) {
      return res.status(500).json({
        success: false,
        message: "AI Response is empty or invalid",
      });
    }
    let ParsedProduct;
    try {
      ParsedProduct = JSON.parse(CleanedText);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to parse AI response",
      });
    }

    return { success: true, products: ParsedProduct };
  } catch (error) {
    console.error("AI Error", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = getAIRecommendation;
