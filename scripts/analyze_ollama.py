import pandas as pd
from pandasai import SmartDataframe
from pandasai.llm.local_llm import LocalLLM

# Choose your model here
ollama_llm = LocalLLM(
    api_base="http://localhost:11434/v1",
    model="qwen2.5-coder:32b"  # or "deepseek-coder:33b"
)

df = pd.read_csv(r"S:\SAIC\Git_projects\homeProjects\diceSimulator\data\with-trial-sorted.csv", encoding="utf-16")

smart_df = SmartDataframe(df, config={"llm": ollama_llm})

# Now ask questions in natural language
# print(smart_df.chat("What are the top 10 rows?"))
# print(smart_df.chat("Calculate the average of column X grouped by column Y"))
# print(smart_df.chat("Plot the distribution of column Z"))  # It can generate plots too!
# print(smart_df.chat("Find rows where column A > 100 and column B contains 'text'"))

# Interactive loop
while True:
    query = input("Ask a question about the data (or 'quit'): ")
    if query.lower() == 'quit':
        break
    response = smart_df.chat(query)
    print(response)