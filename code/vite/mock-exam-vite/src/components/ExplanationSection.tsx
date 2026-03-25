import React from "react";

interface ExplanationSectionProps {
  correctStatement: string;
  isCorrect: boolean;
  explanation: string;
  isAnswered: boolean;
}

export const ExplanationSection: React.FC<ExplanationSectionProps> = ({
  correctStatement,
  isCorrect,
  explanation,
  isAnswered,
}) => {
  if (!isAnswered) return null;

  return (
    <div
      className={`mb-4 p-4 bg-background border-l-4 ${
        isCorrect ? "border-green-500" : "border-red-500"
      } rounded`}
    >
      <h2
        className={`text-lg font-semibold pb-2 ${
          isCorrect ? "text-green-500" : "text-red-500"
        }`}
      >
        {isCorrect ? "Correct!" : "Incorrect!"}
      </h2>
      <h2 className="font-semibold text-lg text-foreground mb-1 pb-2">
        {!isCorrect && (
          <>
            Correct Answer:{" "}
            <span className="text-green-500">{correctStatement}</span>
          </>
        )}
      </h2>
      <h3 className="font-semibold text-lg text-foreground mb-1">Explanation</h3>
      <p style={{ whiteSpace: "pre-line" }}>{explanation}</p>
    </div>
  );
};

export default ExplanationSection;
