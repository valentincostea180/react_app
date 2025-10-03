import React, { useState, useEffect } from "react";

// obiect mesaj
interface NewsItem {
  message: string;
}

// status indicators
interface ApiResponse {
  status: "success" | "error";
  data: NewsItem[];
  message?: string;
}

// path-uri server si json
interface Props {
  jsonUrl: string;
  path: string;
}

const Stiri: React.FC<Props> = ({ jsonUrl, path }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);

  // fetch mesaje
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(jsonUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiResponse: ApiResponse = await response.json();

        // Check if the API response was successful
        if (apiResponse.status === "success") {
          // Extract just the message strings from the data array
          const messageStrings = apiResponse.data.map((item) => item.message);
          setMessages(messageStrings);
          setError(null);
        } else {
          throw new Error(
            apiResponse.message || "Server returned error status"
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load messages"
        );
        setMessages([]); // Fallback to empty array
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [jsonUrl]);

  // rotatie mesaje
  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

  // functie stergere mesaj
  const deleteMessage = async (index: number) => {
    try {
      const response = await fetch(`http://${path}:5000/delete-news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ index }),
      });

      const result = await response.json();

      if (result.status === "success") {
        // Update local state with the new data from server
        setMessages(result.data.map((item: NewsItem) => item.message));
      } else {
        console.error("Failed to delete message:", result.message);
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  // functie adaugare mesaj
  const addMessage = async (newMessage: string) => {
    if (newMessage.trim() === "") return;

    try {
      const response = await fetch(`http://${path}:5000/add-news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: newMessage }),
      });

      const result = await response.json();

      if (result.status === "success") {
        // Update local state with the new data from server
        setMessages(result.data.map((item: NewsItem) => item.message));
      } else {
        console.error("Failed to add message:", result.message);
      }
    } catch (err) {
      console.error("Error adding message:", err);
    }
  };

  return (
    <>
      {loading && (
        <div className="news-ticker-container">
          <div className="news-ticker-message">Se încarcă știrile...</div>
        </div>
      )}

      {error && (
        <div className="news-ticker-container">
          <div className="news-ticker-message error">
            Eroare la încărcare: {error}
          </div>
        </div>
      )}

      {messages.length === 0 && (
        <div className="news-ticker-container">
          <div
            className="news-ticker-message"
            onClick={() => setShowComments(true)}
          >
            Nu există știri momentan.
          </div>
        </div>
      )}

      {messages.length !== 0 && (
        <div className="news-ticker-container">
          <div
            className="news-ticker-message"
            onClick={() => setShowComments(true)}
          >
            {messages[currentMessageIndex]}
          </div>
        </div>
      )}

      {showComments && (
        <div className="comments-modal">
          <div className="comments-content">
            <div className="comments-header">
              <h2 className="titlu-table-news">Știri</h2>
              <button
                className="close-btn"
                onClick={() => setShowComments(false)}
              >
                ×
              </button>
            </div>

            <div className="add-comment">
              <input
                type="text"
                placeholder="Adaugă o știre nouă..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addMessage(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input =
                    e.currentTarget.parentElement?.querySelector("input");
                  if (input) {
                    addMessage(input.value);
                    input.value = "";
                  }
                }}
              >
                Adaugă
              </button>
            </div>

            <div className="comments-list">
              {messages.length === 0 ? (
                <p>Nu există știri.</p>
              ) : (
                <table className="comments-table">
                  <thead>
                    <tr>
                      <th>Știre</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((message, index) => (
                      <tr key={index}>
                        <td>{message}</td>
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => deleteMessage(index)}
                          >
                            Șterge
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Stiri;
