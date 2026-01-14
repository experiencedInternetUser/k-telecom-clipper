import { useEffect, useState } from "react";
import styles from "./StreamModal.module.css";
import type { Stream, AdminUser } from "../../types/Admin";
import UsersAccessModal from "./UsersAccessModal";

type Props = {
  stream: Stream | null;
  users: AdminUser[];
  onClose: () => void;
  onSubmit: (payload: {
    url: string;
    description: string;
    userIds: number[];
  }) => void;
};

const StreamModal = ({ stream, users, onClose, onSubmit }: Props) => {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isUsersModalOpen, setUsersModalOpen] = useState(false);

  useEffect(() => {
    if (stream) {
      setUrl(stream.url);
      setDescription(stream.description);
    }
  }, [stream]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      url,
      description,
      userIds: selectedUserIds,
    });
  };

  return (
    <>
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <h2>{stream ? "Редактировать поток" : "Создать поток"}</h2>

          <form onSubmit={handleSubmit}>
            <label>
              URL потока
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </label>

            <label>
              Описание
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <button
              type="button"
              className={styles.accessButton}
              onClick={() => setUsersModalOpen(true)}
            >
              Пользователи с доступом ({selectedUserIds.length})
            </button>

            <div className={styles.actions}>
              <button type="submit" className={styles.save}>
                Сохранить
              </button>
              <button type="button" onClick={onClose}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>

      {isUsersModalOpen && (
        <UsersAccessModal
          allUsers={users}
          selected={selectedUserIds}
          onClose={() => setUsersModalOpen(false)}
          onConfirm={(ids: number[]) => {
            setSelectedUserIds(ids);
            setUsersModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export default StreamModal;
