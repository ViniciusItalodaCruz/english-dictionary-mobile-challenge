import axios from "axios";

interface WordPhonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
}

interface WordDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface WordMeaning {
  partOfSpeech: string;
  definitions: WordDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface WordDetails {
  word: string;
  phonetic?: string;
  phonetics?: WordPhonetic[];
  meanings?: WordMeaning[];
  origin?: string;
  sourceUrls?: string[];
}

export type GetWordDetailsOutput = WordDetails[];

const DICTIONARY_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

export async function getWordDetails(
  word: string,
  signal?: AbortSignal,
): Promise<GetWordDetailsOutput> {
  const { data } = await axios.get<GetWordDetailsOutput>(
    `${DICTIONARY_API_URL}/${encodeURIComponent(word)}`,
    { signal },
  );

  return data;
}
