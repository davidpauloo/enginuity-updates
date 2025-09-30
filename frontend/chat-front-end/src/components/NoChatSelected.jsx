// src/components/NoChatSelected.jsx
const NoChatSelected = () => {
  return (
    <section className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <img
          src="/chat-empty.svg"
          alt="No chat selected"
          className="mx-auto w-28 h-28 opacity-70"
        />
        <h2 className="text-lg font-semibold">No chat selected</h2>
        <p className="text-sm text-base-content/70">
          Choose a client from the left to start messaging.
        </p>
      </div>
    </section>
  );
};

export default NoChatSelected;
