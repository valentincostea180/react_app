import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface DropzoneProps {
  onUploadSuccess?: (filename: string) => void;
  onUploadError?: (error: string) => void;
  onFileUpload?: (file: File) => void;
  heading: string;
  uploadType:
    | "excelMare"
    | "productionPlan"
    | "Formular BOS"
    | "Formular raportare eveniment la limita producerii unui accident sau situație periculoasă";
}

export default function Dropzone({
  onUploadSuccess,
  onUploadError,
  onFileUpload,
  heading,
  uploadType,
}: DropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // If onFileUpload is provided, use it instead of the default upload logic
      if (onFileUpload) {
        onFileUpload(file);
        return;
      }

      // Default upload logic
      setUploading(true);
      setProgress(0);

      const formData = new FormData();

      // Server expects the field name to be "file" for both endpoints
      formData.append("file", file);

      // Determine the correct endpoint based on uploadType
      const endpoint =
        uploadType === "excelMare"
          ? "http://localhost:5000/upload"
          : uploadType === "productionPlan"
          ? "http://localhost:5000/upload-production-plan"
          : uploadType === "Formular BOS"
          ? "http://localhost:5000/upload-bos"
          : "http://localhost:5000/upload-nm";

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Upload failed with status ${response.status}`
          );
        }

        const result = await response.json();
        onUploadSuccess?.(result.filename);

        // Optionally automatically process the file after upload
        if (result.status === "success") {
          const processEndpoint = "http://localhost:5000/run-script";

          fetch(processEndpoint)
            .then((processResponse) => processResponse.json())
            .then((processResult) => {
              console.log(
                `${uploadType} processed successfully:`,
                processResult
              );
            })
            .catch((processError) => {
              console.error(`Error processing ${uploadType}:`, processError);
            });
        }
      } catch (error) {
        console.error("Upload error:", error);
        onUploadError?.(
          error instanceof Error ? error.message : "Upload failed"
        );
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onUploadSuccess, onUploadError, uploadType, onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  return (
    <div className="dropzone-container">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""} ${
          uploading ? "uploading" : ""
        }`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="upload-progress">
            <p>Uploading... {progress}%</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ) : isDragActive ? (
          <p>Drop the Excel file here...</p>
        ) : (
          <div>
            <p className="dropzone-heading">{heading}</p>
            <p className="dropzone-instruction">
              Drag & drop an Excel file here, or click to select
            </p>
            <p className="dropzone-file-type">
              {uploadType === "excelMare"
                ? "Main Excel File"
                : uploadType === "productionPlan"
                ? "Production Plan File"
                : uploadType === "Formular BOS"
                ? "BOS File"
                : "NM File"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
