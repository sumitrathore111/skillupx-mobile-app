import { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { useDataContext } from "../Context/UserDataContext";

interface Question {
  id: number;
  question: string;
  answer: string;
  ans_user: string
  createdAt: any; // Changed from Timestamp to any
  userId?: string;

}

export default function QueryScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isQuestiontoday, setisquestiontoday] = useState('')

  const { user } = useAuth()

  const { writeQueryOnDate, fetchTodayQueries } = useDataContext()

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;

    const newQ: Question = {
      id: questions.length + 1,
      question: newQuestion,
      answer: "Waiting for answer...",
      createdAt: new Date(),
      ans_user: '',
      userId: user?.id
    };
    setQuestions([...questions, newQ]);
    setNewQuestion("");
    writeQueryOnDate(newQ as any)
  };

  useEffect(() => {
    fetchTodayQueries().then(async (data) => {
      const questionsData: Question[] = data.map((item: any) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        ans_user: item.ans_user,
        createdAt: item.createdAt,
        userId: item.userId
      }));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (questionsData.length !== 0) {
        setQuestions(questionsData);
      }
      else {
        setisquestiontoday("No Question Today!!")
      }
    })
  }, [])


  if (questions.length == 0 && isQuestiontoday == "") {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-black">
        <div className="text-gray-500 dark:text-gray-400">Loading Question</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full bg-white dark:bg-black p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Query & Discussion</h1>

      {/* Question List */}
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{q.question}</h2>
            <p className="text-gray-700 dark:text-gray-300 mt-2">{q.answer}</p>


            <div className="mt-2 space-x-2">

              <span

                className="text-blue-600 dark:text-blue-400 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded"
              >
                {q.ans_user}
              </span>

            </div>

          </div>
        ))}
      </div>

      {/* Add Question */}
      <div className="mt-6 bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Type your question..."
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAddQuestion}
          className="mt-3 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: '#00ADB5' }}
        >
          Add Question
        </button>
      </div>
    </div>
  );
}
