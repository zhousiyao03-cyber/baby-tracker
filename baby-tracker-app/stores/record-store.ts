import { create } from "zustand";
import { ParsedRecord } from "@/types";

interface RecordState {
  parsedRecords: ParsedRecord[];
  originalText: string;

  setParsedRecords: (records: ParsedRecord[], text: string) => void;
  updateParsedRecord: (index: number, record: ParsedRecord) => void;
  removeParsedRecord: (index: number) => void;
  clearParsed: () => void;
}

export const useRecordStore = create<RecordState>((set, get) => ({
  parsedRecords: [],
  originalText: "",

  setParsedRecords: (records, text) =>
    set({ parsedRecords: records, originalText: text }),

  updateParsedRecord: (index, record) => {
    const records = [...get().parsedRecords];
    records[index] = record;
    set({ parsedRecords: records });
  },

  removeParsedRecord: (index) => {
    const records = get().parsedRecords.filter((_, i) => i !== index);
    set({ parsedRecords: records });
  },

  clearParsed: () => set({ parsedRecords: [], originalText: "" }),
}));
