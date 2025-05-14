import { X } from 'lucide-react';

export default function FilePreviewModal({ file, onClose }) {
  if (!file) return null;

  return (
    <dialog open className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{file.fileName}</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto border rounded p-2 bg-base-100">
          {file.fileName.endsWith('.pdf') ? (
            <iframe src={file.filePath} title="PDF Preview" className="w-full h-[70vh]" />
          ) : file.fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? (
            <img src={file.filePath} alt="Preview" className="max-w-full max-h-[70vh] object-contain mx-auto" />
          ) : file.fileName.endsWith('.txt') ? (
            <iframe src={file.filePath} title="Text Preview" className="w-full h-[70vh]" />
          ) : (
            <p className="text-sm italic text-base-content/60">Preview not available for this file type.</p>
          )}
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
