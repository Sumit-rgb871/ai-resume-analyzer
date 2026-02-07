const { HfInference } = require("@huggingface/inference");

const hf = new HfInference(process.env.HF_API_KEY);

exports.analyzeWithAI = async (text) => {
  try {
    console.log("📤 Sending to Hugging Face:", text.slice(0, 200));

    const result = await hf.textClassification({
      model: "distilbert-base-uncased-finetuned-sst-2-english",
      inputs: text.slice(0, 3000),
    });

    console.log("📥 HF response:", result);
    return result;

  } catch (error) {
    console.error("🔥 AI SERVICE ERROR:", error.message);
    throw error;
  }
};
