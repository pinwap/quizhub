import json
import re

def transform_questions(data):
    transformed = []
    for item in data:
        # Remove the question number from the question text (e.g., "1. " at the start)
        question_text = re.sub(r'^\s*\d+\.\s*', '', item['question'])

        # Transform the options array into a list of objects with 'statement' and 'istrue'
        correct_index = item['answer']  # Assuming this is a 0-index based value
        new_options = []
        for idx, option in enumerate(item['options']):
            new_options.append({
                "statement": option,
                "istrue": (idx == correct_index)
            })

        # Build the transformed item without the 'answer' key
        transformed_item = {
            "question": question_text,
            "options": new_options,
            "explanation": item["explanation"]
        }
        transformed.append(transformed_item)

    return transformed

if __name__ == "__main__":
    # Load the JSON data from the input file
    with open('src/data/actual-8.json', 'r', encoding='utf-8') as infile:
        data = json.load(infile)

    # Transform the data
    transformed_data = transform_questions(data)

    # Save the transformed data to a new JSON file with proper Thai characters
    with open('src/data/transformed_actual-8.json', 'w', encoding='utf-8') as outfile:
        json.dump(transformed_data, outfile, indent=2, ensure_ascii=False)

    print("Transformation complete. Check src/data/transformed_actual-8.json for the results.")
