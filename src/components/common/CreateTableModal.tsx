import { useState } from "react";
import { Modal } from "./Modal";

interface CreateTableModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function CreateTableModal({ open, onClose, onSubmit }: CreateTableModalProps) {
  const [name, setName] = useState("");

  return (
    <Modal open={open} title="Create Table" onClose={onClose}>
      <div className="modal-body">
        <label className="modal-field">
          <span>Table name</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Contacts"
          />
        </label>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="action-button"
            onClick={() => {
              onSubmit(name);
              setName("");
            }}
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}
