import React, { useState, useEffect, useRef } from "react";
// --- AI API Configuration ---
const API_KEY = ""; // This will be handled by the environment, leave it as an empty string.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
// DEFAULT PHONOLOGY DATA
const defaultPhonology = {
  phonemes: [
    // Consonants
    { orth: "p", ipa: "p", type: "consonant" },
    { orth: "t", ipa: "t", type: "consonant" },
    { orth: "k", ipa: "k", type: "consonant" },
    { orth: "b", ipa: "b", type: "consonant" },
    { orth: "d", ipa: "d", type: "consonant" },
    { orth: "g", ipa: "g", type: "consonant" },
    { orth: "m", ipa: "m", type: "consonant" },
    { orth: "n", ipa: "n", type: "consonant" },
    { orth: "f", ipa: "f", type: "consonant" },
    { orth: "v", ipa: "v", type: "consonant" },
    { orth: "s", ipa: "s", type: "consonant" },
    { orth: "z", ipa: "z", type: "consonant" },
    { orth: "sh", ipa: "ʃ", type: "consonant" },
    { orth: "zh", ipa: "ʒ", type: "consonant" },
    { orth: "x", ipa: "x", type: "consonant" },
    { orth: "h", ipa: "h", type: "consonant" },
    { orth: "ts", ipa: "ts", type: "consonant" },
    { orth: "ch", ipa: "tʃ", type: "consonant" },
    { orth: "j", ipa: "dʒ", type: "consonant" },
    { orth: "l", ipa: "l", type: "consonant" },
    { orth: "r", ipa: "r", type: "consonant" },
    { orth: "y", ipa: "j", type: "consonant" },
    { orth: "w", ipa: "w", type: "consonant" },
    { orth: "dz", ipa: "dz", type: "consonant" },
    { orth: "q", ipa: "q", type: "consonant" },
    { orth: "th", ipa: "θ", type: "consonant" },
    { orth: "dh", ipa: "ð", type: "consonant" },
    { orth: "sj", ipa: "ɕ", type: "consonant" },
    { orth: "zj", ipa: "ʑ", type: "consonant" },
    // Vowels
    { orth: "a", ipa: "a", type: "vowel" },
    { orth: "e", ipa: "e", type: "vowel" },
    { orth: "i", ipa: "i", type: "vowel" },
    { orth: "o", ipa: "o", type: "vowel" },
    { orth: "u", ipa: "u", type: "vowel" },
    { orth: "ï", ipa: "ɨ", type: "vowel" },
    { orth: "ä", ipa: "ɑ", type: "vowel" },
    { orth: "ö", ipa: "ɔ", type: "vowel" },
    { orth: "ë", ipa: "ɛ", type: "vowel" },
    { orth: "ü", ipa: "ə", type: "vowel" },
    { orth: "ai", ipa: "aɪ", type: "vowel" },
    { orth: "ao", ipa: "aɔ", type: "vowel" },
    { orth: "ei", ipa: "eɪ", type: "vowel" },
    { orth: "au", ipa: "aʊ", type: "vowel" },
    { orth: "ia", ipa: "iɑ", type: "vowel" },
  ],
  // SOUND CHANGES
  soundChanges: [
    {
      id: 1,
      find: "th,dh,k,g",
      replace: "ch,j,sh,zh",
      preceding: "",
      following: "i,a",
      description: "{thi,dhi,ki,gi} -> {ch,j,sh,zh} / _a",
    },
    {
      id: 2,
      find: "r",
      replace: "t",
      preceding: "",
      following: "i,u",
      description: "r -> t / _{i,u}",
    },
    {
      id: 3,
      find: "t,d",
      replace: "ts,dz",
      preceding: "",
      following: "i,e,ï",
      description: "{t,d} -> {ts,dz} / _{i,e,ï}",
    },
    {
      id: 4,
      find: "p,t,k,b,d",
      replace: "f,s,x,v,dh",
      preceding: "V",
      following: "V",
      description: "{p,t,k,b,d} -> {f,s,x,v,dh} / V_V",
    },
    {
      id: 5,
      find: "s,z,t",
      replace: "sj,zj,ch",
      preceding: "!t,d",
      following: "i,e,ë,ei,ia",
      description: "{s,z,t} -> {sj,zj,ch} / !{t,d}_V",
    },
    {
      id: 6,
      find: "ia",
      replace: "a",
      preceding: "sj,zj",
      following: "",
      description: "{sjia, zjia} -> {sja, zja}",
    },
    {
      id: 7,
      find: "ai,ie,uo,ia,au,ao,ei,a,e,i,o,u,ä,ë,ï,ö",
      replace: "ə",
      preceding: "#",
      following: "",
      description: "V/ə/_#",
    },
  ],
};
//  PHONOLOGY ENGINE
const tokenize = (
  word: string,
  phonemes: { orth: string; ipa: string; type: string }[]
) => {
  if (!word) return [];
  let tokens = [];
  let i = 0;
  const lowerWord = word.toLowerCase();
  const sortedPhonemes = [...phonemes].sort(
    (a, b) => b.orth.length - a.orth.length
  );
  while (i < lowerWord.length) {
    let matched = false;
    for (const phoneme of sortedPhonemes) {
      if (lowerWord.startsWith(phoneme.orth, i)) {
        tokens.push(phoneme.orth);
        i += phoneme.orth.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(lowerWord[i]);
      i++;
    }
  }
  return tokens;
};

const applySoundChanges = (
  initialPhonemes: any[],
  phonology: { phonemes: any; soundChanges: any }
) => {
  let currentPhonemes = [...initialPhonemes];
  const { phonemes: phonemeSet, soundChanges } = phonology;
  const VOWELS = phonemeSet
    .filter((p: { type: string }) => p.type === "vowel")
    .map((p: { orth: any }) => p.orth);
  const CONSONANTS = phonemeSet
    .filter((p: { type: string }) => p.type === "consonant")
    .map((p: { orth: any }) => p.orth);
  const checkContext = (phoneme: string, contextStr: string) => {
    if (!contextStr) return true;
    if (!phoneme) phoneme = "#";
    let isNegated = contextStr.startsWith("!");
    if (isNegated) contextStr = contextStr.substring(1);

    let contextParts = contextStr.split(",");
    let match = false;
    for (const part of contextParts) {
      if (part === "V" && VOWELS.includes(phoneme)) {
        match = true;
        break;
      }
      if (part === "C" && CONSONANTS.includes(phoneme)) {
        match = true;
        break;
      }
      if (part === "#" && phoneme === "#") {
        match = true;
        break;
      }
      if (part === phoneme) {
        match = true;
        break;
      }
    }
    return isNegated ? !match : match;
  };
  for (const rule of soundChanges) {
    const findTokens = rule.find.split(",");
    const replaceTokens = rule.replace.split(",");
    if (findTokens.length !== replaceTokens.length) {
      continue;
    }
    let newPhonemes = [];
    let i = 0;
    while (i < currentPhonemes.length) {
      const currentPhoneme = currentPhonemes[i];
      const findIndex = findTokens.indexOf(currentPhoneme);
      if (findIndex !== -1) {
        const prevPhoneme = currentPhonemes[i - 1] || null;
        const nextPhoneme = currentPhonemes[i + 1] || null;
        if (
          checkContext(prevPhoneme, rule.preceding) &&
          checkContext(nextPhoneme, rule.following)
        ) {
          newPhonemes.push(replaceTokens[findIndex]);
        } else {
          newPhonemes.push(currentPhoneme);
        }
      } else {
        newPhonemes.push(currentPhoneme);
      }
      i++;
    }
    currentPhonemes = newPhonemes;
  }
  return currentPhonemes;
};
const toIPA = (
  phonemes: any[],
  phonemeSet: { orth: string; ipa: string; type: string }[]
) => {
  const phonemeMap = Object.fromEntries(
    phonemeSet.map((p: { orth: any; ipa: any }) => [p.orth, p.ipa])
  );
  return phonemes
    .map((p: string | number) => phonemeMap[p] || `?${p}?`)
    .join("");
};
// Parts of speech options and colors
const partOfSpeechOptions = [
  "",
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "quantifier",
  "interjection",
  "affix",
  "conjunction",
  "particle",
  "other",
];
const partOfSpeechColors = {
  noun: "border-sky-500 dark:border-sky-300",
  verb: "border-emerald-500 dark:border-emerald-300",
  adjective: "border-red-500 dark:border-red-300",
  adverb: "border-yellow-500 dark:border-yellow-300",
  preposition: "border-violet-500 dark:border-violet-300",
  quantifier: "border-fuchsia-500 dark:border-fuchsia-300",
  interjection: "border-rose-500 dark:border-rose-300",
  affix: "border-cyan-500 dark:border-cyan-300",
  conjunction: "border-stone-500 dark:border-stone-300",
  particle: "border-slate-500 dark:border-slate-300",
  other: "border-gray-500 dark:border-gray-300",
};
// Function to create a new definition object
const newDefinition = () => ({
  id: Date.now(),
  partOfSpeech: partOfSpeechOptions[0],
  definition: "",
  etymology: "",
  exampleSentence: "",
  tags: "", // Tags are now per-definition
});
// Main App Component
const App = () => {
  // Dark Mode Toggle
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(!darkMode);
  //  State for Phonology
  const [phonology, setPhonology] = useState(defaultPhonology);
  //  State for Forms and Dictionary Data
  const [word, setWord] = useState("");
  const [definitions, setDefinitions] = useState([newDefinition()]);
  const [pronunciation, setPronunciation] = useState("");
  const [dictionary, setDictionary] = useState([]);
  //  State for Derivation Reference
  const [derivationsReference, setDerivationsReference] = useState([]);
  const [showDerivationsReference, setShowDerivationsReference] =
    useState(false);
  //  State for Grammar
  const [showGrammarReference, setShowGrammarReference] = useState(false);
  //  Pronouns
  const [pronounNotes, setPronounNotes] = useState("");
  const [showPronounsReference, setShowPronounsReference] = useState(false);
  //  Nouns
  const [nounNotes, setNounNotes] = useState("");
  const [showNounsReference, setShowNounsReference] = useState(false);
  //  Verbs
  const [verbNotes, setVerbNotes] = useState("");
  const [showVerbsReference, setShowVerbsReference] = useState(false);
  //  State for Search and Edit Functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  //  UI State for Modals
  const [showPhonologyEditor, setShowPhonologyEditor] = useState(false);
  const [showPhonemeChart, setShowPhonemeChart] = useState(false);
  const [generatingDefs, setGeneratingDefs] = useState({});
  const [isGeneratingGrammar, setIsGeneratingGrammar] = useState(false);

  const [messageBox, setMessageBox] = useState({
    visible: false,
    message: "",
    type: "",
    confirm: false,
    onConfirm: null,
  });
  //  Refs for File Input
  const fileInputRef = useRef(null);
  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const storedDictionary = localStorage.getItem("conlangDictionary");
      if (storedDictionary) setDictionary(JSON.parse(storedDictionary));

      const storedPhonology = localStorage.getItem("conlangPhonology");
      if (storedPhonology) setPhonology(JSON.parse(storedPhonology));

      const storedDerivationsReference = localStorage.getItem(
        "conlangDerivationsReference"
      );
      if (storedDerivationsReference)
        setDerivationsReference(JSON.parse(storedDerivationsReference));

      const storedPronounNotes = localStorage.getItem("conlangPronounNotes");
      if (storedPronounNotes) setPronounNotes(JSON.parse(storedPronounNotes));

      const storedNounNotes = localStorage.getItem("conlangNounNotes");
      if (storedNounNotes) setNounNotes(JSON.parse(storedNounNotes));

      const storedVerbNotes = localStorage.getItem("conlangVerbNotes");
      if (storedVerbNotes) setVerbNotes(JSON.parse(storedVerbNotes));
    } catch (error) {
      showMessageBox("Could not load saved data.", "Error");
    }
  }, []);
  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("conlangDictionary", JSON.stringify(dictionary));
      localStorage.setItem("conlangPhonology", JSON.stringify(phonology));
      localStorage.setItem(
        "conlangDerivationsReference",
        JSON.stringify(derivationsReference)
      );
      localStorage.setItem("conlangPronounNotes", JSON.stringify(pronounNotes));
      localStorage.setItem("conlangNounNotes", JSON.stringify(nounNotes));
      localStorage.setItem("conlangVerbNotes", JSON.stringify(verbNotes));
    } catch (error) {
      showMessageBox("Could not save data to local storage.", "Error");
    }
  }, [
    dictionary,
    phonology,
    derivationsReference,
    pronounNotes,
    nounNotes,
    verbNotes,
  ]);
  // Recalculate pronunciation
  useEffect(() => {
    if (word) {
      const tokenized = tokenize(word, phonology.phonemes);
      const changedPhonemes = applySoundChanges(tokenized, phonology);
      setPronunciation(toIPA(changedPhonemes, phonology.phonemes));
    } else {
      setPronunciation("");
    }
  }, [word, phonology]);
  // --- Gemini API Call Functions ---
  const handleGenerateDefinition = async (defId: number, index: number) => {
    const currentDef = definitions.find((d) => d.id === defId);
    if (!word || !currentDef || !currentDef.partOfSpeech) {
      showMessageBox(
        "Please provide a word and part of speech before generating a definition.",
        "Error"
      );
      return;
    }
    setGeneratingDefs((prev) => ({ ...prev, [defId]: true }));
    const prompt = `You are a creative linguist and world-builder creating a dictionary for a fantasy language.
    The word is: "${word}"
    Part of Speech: ${currentDef.partOfSpeech}
    Etymology/Context/Tags: ${currentDef.etymology} ${currentDef.tags}
    Based on this information, invent a plausible, creative definition and a rich example sentence for this word.
    Return the response as a valid JSON object with two keys: "definition" and "exampleSentence".`;
    try {
      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              definition: { type: "STRING" },
              exampleSentence: { type: "STRING" },
            },
          },
        },
      };
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        const newDefs = [...definitions];
        const defIndex = newDefs.findIndex((d) => d.id === defId);
        if (defIndex !== -1) {
          newDefs[defIndex].definition = parsed.definition;
          newDefs[defIndex].exampleSentence = parsed.exampleSentence;
          setDefinitions(newDefs);
        }
      } else {
        throw new Error("Received an empty response from the API.");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      showMessageBox(
        `Failed to generate definition. ${error.message}`,
        "Error"
      );
    } finally {
      setGeneratingDefs((prev) => ({ ...prev, [defId]: false }));
    }
  };
  const handleGenerateGrammarNotes = async (
    category: any,
    currentNotes: any,
    setNotes: (arg0: any) => void
  ) => {
    setIsGeneratingGrammar(true);
    const prompt = `You are an expert linguist and world-builder creating a grammar reference for a fictional language. The user is working on the ${category} section.
    Here are the user's current notes:
    "${currentNotes}"
    Your task is to expand on these notes. If they are empty, generate a complete and creative set of grammatical rules for ${category} from scratch. Provide interesting features, clear explanations, and use Markdown tables to organize paradigms (like declensions or conjugations) where appropriate.`;
    try {
      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      };
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok)
        throw new Error(`API request failed with status ${response.status}`);

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        setNotes(text);
      } else {
        throw new Error("Received an empty response from the API.");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      showMessageBox(
        `Failed to generate grammar notes. ${error.message}`,
        "Error"
      );
    } finally {
      setIsGeneratingGrammar(false);
    }
  };

  //  Form Management
  const clearForm = () => {
    setWord("");
    setDefinitions([newDefinition()]);
    setPronunciation("");
    setIsEditing(false);
    setCurrentEditId(null);
  };
  const handleDefinitionChange = (
    index: number,
    field: string,
    value: string
  ) => {
    const newDefs = [...definitions];
    newDefs[index][field] = value;
    setDefinitions(newDefs);
  };
  const addDefinitionField = () => {
    setDefinitions([...definitions, newDefinition()]);
  };

  const removeDefinitionField = (id: number) => {
    setDefinitions(definitions.filter((def) => def.id !== id));
  };

  const handleSubmitWord = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!word || definitions.some((d) => !d.definition || !d.partOfSpeech)) {
      showMessageBox(
        "Please fill in the Word and at least one full Definition with a Part of Speech.",
        "Error"
      );
      return;
    }
    const lowerCaseWord = word.toLowerCase();
    // Process tags for each definition
    const finalDefinitions = definitions.map((def) => ({
      ...def,
      tags:
        typeof def.tags === "string"
          ? def.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : def.tags,
    }));
    if (isEditing && currentEditId !== null) {
      if (
        dictionary.some(
          (entry) => entry.id !== currentEditId && entry.word === lowerCaseWord
        )
      ) {
        showMessageBox(`The word '${word}' already exists.`, "Error");
        return;
      }
      const updatedDictionary = dictionary.map((entry) =>
        entry.id === currentEditId
          ? {
              ...entry,
              word: lowerCaseWord,
              definitions: finalDefinitions,
              pronunciation,
            }
          : entry
      );
      setDictionary(updatedDictionary);
      showMessageBox(`Word '${word}' updated successfully!`, "Success");
    } else {
      if (dictionary.some((entry) => entry.word === lowerCaseWord)) {
        showMessageBox(`The word '${word}' already exists.`, "Error");
        return;
      }
      const newEntry = {
        id: Date.now(),
        word: lowerCaseWord,
        definitions: finalDefinitions.map((def) => ({
          ...def,
          tags: Array.isArray(def.tags)
            ? def.tags
            : def.tags
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean),
        })),
        pronunciation,
      };
      setDictionary(
        [...dictionary, newEntry].sort((a, b) => a.word.localeCompare(b.word))
      );
      showMessageBox(`Word '${word}' added successfully!`, "Success");
    }
    clearForm();
  };
  const handleEdit = (entryToEdit: never) => {
    setWord(entryToEdit.word);
    // Join tags back to string for editing
    const defsToEdit = entryToEdit.definitions.map((def: { tags: any[] }) => ({
      ...def,
      tags: Array.isArray(def.tags) ? def.tags.join(", ") : def.tags,
    }));
    setDefinitions(defsToEdit);
    setPronunciation(entryToEdit.pronunciation);
    setIsEditing(true);
    setCurrentEditId(entryToEdit.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleDelete = (entryToDelete: never) => {
    showConfirmBox(
      `Are you sure you want to delete '${entryToDelete.word}'?`,
      () => {
        const updatedDictionary = dictionary.filter(
          (entry) => entry.id !== entryToDelete.id
        );
        setDictionary(updatedDictionary);
        showMessageBox(`Word '${entryToDelete.word}' deleted.`, "Success");
        if (currentEditId === entryToDelete.id) {
          clearForm();
        }
      }
    );
  };
  //  Import/Export
  const handleExport = () => {
    try {
      const exportData = {
        dictionary,
        phonology,
        derivationsReference,
        pronounNotes,
        nounNotes,
        verbNotes,
      };
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "conlang_data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessageBox("Data exported successfully!", "Success");
    } catch (error) {
      showMessageBox("Failed to export data.", "Error");
    }
  };
  const handleImport = (e: { target: { files: any[]; value: string } }) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target) return;
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.dictionary && importedData.phonology) {
          setDictionary(importedData.dictionary);
          setPhonology(importedData.phonology);
          setDerivationsReference(importedData.derivationsReference || []);
          setPronounNotes(importedData.pronounNotes || "");
          setNounNotes(importedData.nounNotes || "");
          setVerbNotes(importedData.verbNotes || "");
          showMessageBox("Data imported successfully!", "Success");
        } else {
          showMessageBox("Invalid JSON file format.", "Error");
        }
      } catch (error) {
        showMessageBox("Error parsing JSON file.", "Error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  //  Search Filtering
  const filteredDictionary = dictionary.filter((entry) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    const inWord = entry.word.toLowerCase().includes(query);
    const inDefs = entry.definitions.some(
      (def: {
        definition: string;
        partOfSpeech: string;
        etymology: string;
        exampleSentence: string;
        tags: any[];
      }) =>
        (def.definition && def.definition.toLowerCase().includes(query)) ||
        (def.partOfSpeech && def.partOfSpeech.toLowerCase().includes(query)) ||
        (def.etymology && def.etymology.toLowerCase().includes(query)) ||
        (def.exampleSentence &&
          def.exampleSentence.toLowerCase().includes(query)) ||
        (def.tags &&
          Array.isArray(def.tags) &&
          def.tags.some((tag: string) => tag.toLowerCase().includes(query)))
    );
    return inWord || inDefs;
  });
  //  Message/Confirm Box
  const showMessageBox = (message: string, type = "Info") =>
    setMessageBox({
      visible: true,
      message,
      type,
      confirm: false,
      onConfirm: null,
    });
  const showConfirmBox = (message: string, onConfirm: () => void) =>
    setMessageBox({
      visible: true,
      message,
      type: "Confirm",
      confirm: true,
      onConfirm,
    });
  const closeMessageBox = () =>
    setMessageBox({ ...messageBox, visible: false });
  const handleConfirm = () => {
    if (messageBox.onConfirm) messageBox.onConfirm();
    closeMessageBox();
  };
  return (
    <div
      className={`min-h-screen p-4 sm:p-6 lg:p-8 font-sans flex flex-col items-center ${
        darkMode ? "dark" : ""
      }`}
    >
      <div className="w-full h-full bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-200">
        <MessageBoxModal
          messageBox={messageBox}
          onConfirm={handleConfirm}
          onClose={closeMessageBox}
        />
        {showPhonemeChart && (
          <PhonemeChartModal
            phonology={phonology}
            onClose={() => setShowPhonemeChart(false)}
          />
        )}
        {showPhonologyEditor && (
          <PhonologyEditorModal
            currentPhonology={phonology}
            onSave={setPhonology}
            onClose={() => setShowPhonologyEditor(false)}
          />
        )}
        {showDerivationsReference && (
          <DerivationsReferenceModal
            derivationsReference={derivationsReference}
            setDerivationsReference={setDerivationsReference}
            onClose={() => setShowDerivationsReference(false)}
          />
        )}
        {showGrammarReference && (
          <GrammarReferenceModal
            setShowPronounsReference={setShowPronounsReference}
            setShowNounsReference={setShowNounsReference}
            setShowVerbsReference={setShowVerbsReference}
            onClose={() => setShowGrammarReference(false)}
          />
        )}
        {showPronounsReference && (
          <PronounsReferenceModal
            pronounNotes={pronounNotes}
            setPronounNotes={setPronounNotes}
            isGenerating={isGeneratingGrammar}
            onGenerate={handleGenerateGrammarNotes}
            onClose={() => setShowPronounsReference(false)}
          />
        )}
        {showNounsReference && (
          <NounsReferenceModal
            nounNotes={nounNotes}
            setNounNotes={setNounNotes}
            isGenerating={isGeneratingGrammar}
            onGenerate={handleGenerateGrammarNotes}
            onClose={() => setShowNounsReference(false)}
          />
        )}
        {showVerbsReference && (
          <VerbsReferenceModal
            verbNotes={verbNotes}
            setVerbNotes={setVerbNotes}
            isGenerating={isGeneratingGrammar}
            onGenerate={handleGenerateGrammarNotes}
            onClose={() => setShowVerbsReference(false)}
          />
        )}
        <div className="w-full max-w-4xl mx-auto space-y-8 py-8">
          <div className="bg-neutral-50 dark:bg-neutral-800 p-8 rounded-xl shadow-lg w-full border border-gray-200 dark:border-neutral-800">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-gray-200 mb-6 text-center">
              {isEditing ? "Edit Entry" : "Add New Entry"}
            </h1>
            <form onSubmit={handleSubmitWord} className="space-y-5">
              <div>
                <label
                  htmlFor="word"
                  className="block text-sm font-semibold text-black dark:text-white mb-1"
                >
                  Word
                </label>
                <input
                  type="text"
                  id="word"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="w-full px-4 py-2 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neural-100 dark:bg-neutral-900"
                  required
                />
              </div>
              <hr />
              {definitions.map((def, index) => (
                <div
                  key={def.id}
                  className="p-4 border border-gray-200 dark:border-neutral-800 rounded-lg space-y-4 relative"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                      Definition {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleGenerateDefinition(def.id, index)}
                      disabled={generatingDefs[def.id]}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-wait transition"
                    >
                      {generatingDefs[def.id] ? (
                        <>
                          <Spinner /> Generating...
                        </>
                      ) : (
                        "✨ Suggest"
                      )}
                    </button>
                  </div>

                  {definitions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDefinitionField(def.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold text-xl"
                    >
                      &times;
                    </button>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-neutral-950 dark:text-neutral-50 mb-1">
                      Definition
                    </label>
                    <textarea
                      value={def.definition}
                      onChange={(e) =>
                        handleDefinitionChange(
                          index,
                          "definition",
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neural-100 dark:bg-neutral-900 resize-y"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-950 dark:text-neutral-50 mb-1">
                        Part of Speech
                      </label>
                      <select
                        value={def.partOfSpeech}
                        onChange={(e) =>
                          handleDefinitionChange(
                            index,
                            "partOfSpeech",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 text-neutral950 dark:text-neutral-50 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-900"
                        required
                      >
                        {partOfSpeechOptions.map((option) => (
                          <option key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-950 dark:text-neutral-50 mb-1">
                        Etymology (Optional)
                      </label>
                      <input
                        type="text"
                        value={def.etymology}
                        onChange={(e) =>
                          handleDefinitionChange(
                            index,
                            "etymology",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neural-100 dark:bg-neutral-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-950 dark:text-neutral-50 mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={def.tags}
                      onChange={(e) =>
                        handleDefinitionChange(index, "tags", e.target.value)
                      }
                      className="w-full px-4 py-2 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neural-100 dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-950 dark:text-neutral-50 mb-1">
                      Example Sentence (Optional)
                    </label>
                    <textarea
                      value={def.exampleSentence}
                      onChange={(e) =>
                        handleDefinitionChange(
                          index,
                          "exampleSentence",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="w-full px-4 py-2 text-neutral-950 dark:text-neutral-50 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neural-100 dark:bg-neutral-900 resize-y"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addDefinitionField}
                className="w-full py-2 px-4 border-2 border-dashed border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition"
              >
                Add Definition
              </button>
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Pronunciation (IPA)
                </label>
                <p className="p-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-gray-100 font-mono text-lg text-center">
                  {pronunciation ? (
                    `/${pronunciation}/`
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">
                      Type a word to see pronunciation
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className={`flex-1 py-3 px-6 rounded-lg shadow-md text-lg font-bold text-white transition transform hover:scale-105 ${
                    isEditing
                      ? "bg-green-600 dark:bg-green-400 hover:bg-green-700 dark:hover:bg-green-500"
                      : "bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-500"
                  }`}
                >
                  {isEditing ? "Save Changes" : "Add Word"}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="flex-1 py-3 px-6 rounded-lg shadow-md text-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutarl-700 transition transform hover:scale-105"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800 p-8 rounded-xl shadow-lg w-full border border-gray-200 dark:border-neutral-800">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">
              Dictionary
            </h2>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <button
                onClick={handleExport}
                className="py-2 px-4 bg-gradient-to-r from-orange-600 to-amber-600 dark:bg-gradient-to-r dark:from-orange-400 dark:to-amber-400 text-white rounded-md shadow-sm hover:bg-gradient-to-r hover:from-orange-700 hover:to-amber-700 dark:hover:bg-gradient-to-r dark:hover:from-orange-500 dark:hover:to-amber-500 transition transform hover:scale-105"
              >
                Export Data
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
              />
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 dark:bg-gradient-to-r dark:from-green-400 dark:to-emerald-400 text-white rounded-md shadow-sm hover:bg-gradient-to-r hover:from-green-700 hover:to-emerald-700 dark:hover:bg-gradient-to-r dark:hover:from-green-500 dark:hover:to-emerald-500 transition transform hover:scale-105"
              >
                Import Data
              </button>
              <button
                onClick={() => setShowPhonemeChart(true)}
                className="py-2 px-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:bg-gradient-to-r dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 text-white rounded-md shadow-sm hover:bg-gradient-to-r hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 dark:hover:bg-gradient-to-r dark:hover:from-indigo-500 dark:hover:via-violet-500 dark:hover:to-purple-500 transition transform hover:scale-105"
              >
                Phoneme Chart
              </button>
              <button
                onClick={() => setShowPhonologyEditor(true)}
                className="py-2 px-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:bg-gradient-to-r dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 text-white rounded-md shadow-sm hover:bg-gradient-to-r hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 dark:hover:bg-gradient-to-r dark:hover:from-indigo-500 dark:hover:via-violet-500 dark:hover:to-purple-500 transition transform hover:scale-105"
              >
                Phonology Settings
              </button>
              <button
                onClick={() => setShowDerivationsReference(true)}
                className="py-2 px-4 bg-gradient-to-r from-fuchsia-600 to-rose-600 dark:bg-gradient-to-r dark:from-fuchsia-400 dark:to-rose-400 text-white rounded-md shadow-sm hover:bg-gradient-to-r hover:from-fuchsia-700 hover:to-rose-700 dark:hover:bg-gradient-to-r dark:hover:from-fuchsia-500 dark:hover:to-rose-500 transition transform hover:scale-105"
              >
                Derivation Reference
              </button>
              <button
                onClick={() => setShowGrammarReference(true)}
                className="py-2 px-4 bg-gradient-to-r from-teal-600 to-blue-600 dark:bg-gradient-to-r dark:from-teal-400 dark:to-blue-400 text-white rounded-md shadow-sm hover:bg-gradient-to-r hover:from-teal-700 hover:to-blue-700 dark:hover:bg-gradient-to-r dark:hover:from-teal-500 dark:hover:to-blue-500 transition transform hover:scale-105"
              >
                Grammar Reference
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="py-2 px-4 bg-neutral-200) dark:bg-neutral-600 text-neutral-950 dark:text-neutral-50 rounded-md shadow-sm hover:bg-neutral-300 dark:hover:bg-neutral-700 transition transform hover:scale-105"
              >
                {darkMode ? "🌙" : "☀️"}
              </button>
            </div>
            <div className="mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍Search"
                className="w-full px-4 py-2 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neural-50 dark:bg-neutral-800"
              />
            </div>
            {filteredDictionary.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {dictionary.length === 0
                  ? "Your dictionary is empty."
                  : "No matching words found."}
              </p>
            ) : (
              <ul className="space-y-6">
                {filteredDictionary.map((entry) => (
                  <li
                    key={entry.id}
                    className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-lg border border-gray-200 dark:border-gray-600 shadow-md"
                  >
                    <div className="flex justify-between items-baseline mb-2">
                      <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {entry.word}
                      </h3>
                      <span className="text-lg text-gray-600 dark:text-gray-400 font-mono">
                        /{entry.pronunciation}/
                      </span>
                    </div>

                    <div className="space-y-4">
                      {entry.definitions.map(
                        (
                          def: {
                            partOfSpeech:
                              | string
                              | number
                              | bigint
                              | boolean
                              | React.ReactElement<
                                  unknown,
                                  string | React.JSXElementConstructor<any>
                                >
                              | Iterable<React.ReactNode>
                              | Promise<
                                  | string
                                  | number
                                  | bigint
                                  | boolean
                                  | React.ReactPortal
                                  | React.ReactElement<
                                      unknown,
                                      string | React.JSXElementConstructor<any>
                                    >
                                  | Iterable<React.ReactNode>
                                  | null
                                  | undefined
                                >
                              | null
                              | undefined;
                            id: any;
                            definition:
                              | string
                              | number
                              | bigint
                              | boolean
                              | React.ReactElement<
                                  unknown,
                                  string | React.JSXElementConstructor<any>
                                >
                              | Iterable<React.ReactNode>
                              | React.ReactPortal
                              | Promise<
                                  | string
                                  | number
                                  | bigint
                                  | boolean
                                  | React.ReactPortal
                                  | React.ReactElement<
                                      unknown,
                                      string | React.JSXElementConstructor<any>
                                    >
                                  | Iterable<React.ReactNode>
                                  | null
                                  | undefined
                                >
                              | null
                              | undefined;
                            tags: {
                              length: number;
                              trim: () => {
                                (): any;
                                new (): any;
                                length: number;
                              };
                              split: (arg0: string) => any[];
                            };
                            etymology:
                              | string
                              | number
                              | bigint
                              | boolean
                              | React.ReactElement<
                                  unknown,
                                  string | React.JSXElementConstructor<any>
                                >
                              | Iterable<React.ReactNode>
                              | React.ReactPortal
                              | Promise<
                                  | string
                                  | number
                                  | bigint
                                  | boolean
                                  | React.ReactPortal
                                  | React.ReactElement<
                                      unknown,
                                      string | React.JSXElementConstructor<any>
                                    >
                                  | Iterable<React.ReactNode>
                                  | null
                                  | undefined
                                >
                              | null
                              | undefined;
                            exampleSentence:
                              | string
                              | number
                              | bigint
                              | boolean
                              | React.ReactElement<
                                  unknown,
                                  string | React.JSXElementConstructor<any>
                                >
                              | Iterable<React.ReactNode>
                              | React.ReactPortal
                              | Promise<
                                  | string
                                  | number
                                  | bigint
                                  | boolean
                                  | React.ReactPortal
                                  | React.ReactElement<
                                      unknown,
                                      string | React.JSXElementConstructor<any>
                                    >
                                  | Iterable<React.ReactNode>
                                  | null
                                  | undefined
                                >
                              | null
                              | undefined;
                          },
                          index: any
                        ) => {
                          const borderColor =
                            partOfSpeechColors[def.partOfSpeech] ||
                            "border-gray-300 dark:border-gray-700";
                          return (
                            <div
                              key={def.id || index}
                              className={`border-l-4 ${borderColor} pl-4 py-2`}
                            >
                              <p className="text-neutral-800 dark:text-neutral-200">
                                <strong className="font-semibold text-md">
                                  {def.partOfSpeech}
                                </strong>
                              </p>
                              <p className="text-neutral-950 dark:text-neutral-50 text-lg">
                                {def.definition}
                              </p>
                              {def.tags &&
                                (Array.isArray(def.tags)
                                  ? def.tags.length > 0
                                  : def.tags.trim().length > 0) && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {(Array.isArray(def.tags)
                                      ? def.tags
                                      : def.tags
                                          .split(",")
                                          .map((t: string) => t.trim())
                                          .filter(Boolean)
                                    ).map(
                                      (
                                        tag:
                                          | boolean
                                          | React.Key
                                          | React.ReactElement<
                                              unknown,
                                              | string
                                              | React.JSXElementConstructor<any>
                                            >
                                          | Iterable<React.ReactNode>
                                          | Promise<
                                              | string
                                              | number
                                              | bigint
                                              | boolean
                                              | React.ReactPortal
                                              | React.ReactElement<
                                                  unknown,
                                                  | string
                                                  | React.JSXElementConstructor<any>
                                                >
                                              | Iterable<React.ReactNode>
                                              | null
                                              | undefined
                                            >
                                          | null
                                          | undefined
                                      ) => (
                                        <span
                                          key={tag}
                                          className="px-2 py-1 bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-full"
                                        >
                                          {tag}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}
                              {def.etymology && (
                                <p className="text-sm text-gray-500 italic mt-2">
                                  Etymology: {def.etymology}
                                </p>
                              )}
                              {def.exampleSentence && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic mt-1">
                                  Example: "{def.exampleSentence}"
                                </p>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="px-3 py-1 bg-yellow-500 text-white text-sm font-medium rounded-md hover:bg-yellow-600 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
//  Sub-Components (Modals)
const MessageBoxModal = ({ messageBox, onConfirm, onClose }) => {
  if (!messageBox.visible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <p
          className={`text-lg font-semibold ${
            messageBox.type === "Error"
              ? "text-red-600"
              : messageBox.type === "Success"
              ? "text-green-600"
              : "text-blue-600"
          } mb-4`}
        >
          {messageBox.message}
        </p>
        {messageBox.confirm ? (
          <div className="flex justify-center space-x-4">
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Yes
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-800 transition"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
};
const Spinner = () => (
  <svg
    className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-700 dark:text-purple-200"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);
const PhonemeChartModal = ({ phonology, onClose }) => {
  const { phonemes } = phonology;
  const vowels = phonemes.filter((p: { type: string }) => p.type === "vowel");
  const consonants = phonemes.filter(
    (p: { type: string }) => p.type === "consonant"
  );
  const PhonemeDisplay = ({ p }) => (
    <div
      className={`p-2 rounded-md font-mono ${
        p.type === "vowel"
          ? "bg-green-100 dark:bg-green-900"
          : "bg-blue-100 dark:bg-blue-900"
      }`}
    >
      {p.orth}{" "}
      {p.orth !== p.ipa && (
        <span className="text-gray-800 dark:text-gray-200">→ {p.ipa}</span>
      )}
    </div>
  );
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">
          Phoneme Chart
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b pb-2">
              Consonants
            </h3>
            <div className="flex flex-wrap gap-2">
              {consonants.map((p: unknown) => (
                <PhonemeDisplay key={p.orth} p={p} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b pb-2">
              Vowels
            </h3>
            <div className="flex flex-wrap gap-2">
              {vowels.map((p: unknown) => (
                <PhonemeDisplay key={p.orth} p={p} />
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-8 w-full py-3 px-6 bg-indigo-600 dark:bg-indigo-400 text-white rounded-lg shadow-md hover:bg-indigo-700 transition dark:hover:bg-indigo-500 transition font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );
};
const PhonologyEditorModal = ({ currentPhonology, onSave, onClose }) => {
  const [editablePhonemes, setEditablePhonemes] = useState(
    JSON.parse(JSON.stringify(currentPhonology.phonemes))
  );
  const [rulesText, setRulesText] = useState(
    JSON.stringify(currentPhonology.soundChanges, null, 2)
  );
  const [error, setError] = useState("");
  const handlePhonemeChange = (
    index: string | number,
    field: string,
    value: string
  ) => {
    const newPhonemes = [...editablePhonemes];
    newPhonemes[index][field] = value;
    setEditablePhonemes(newPhonemes);
  };
  const handleAddPhoneme = () => {
    setEditablePhonemes([
      ...editablePhonemes,
      { orth: "", ipa: "", type: "consonant" },
    ]);
  };
  const handleDeletePhoneme = (index: any) => {
    const newPhonemes = editablePhonemes.filter(
      (_: any, i: any) => i !== index
    );
    setEditablePhonemes(newPhonemes);
  };
  const handleSave = () => {
    try {
      const newRules = JSON.parse(rulesText);
      if (!Array.isArray(newRules)) {
        throw new Error("Sound change rules must be a valid JSON array.");
      }
      for (const p of editablePhonemes) {
        if (!p.orth || !p.ipa || !p.type) {
          throw new Error("All phoneme fields (Orth, IPA, Type) are required.");
        }
      }
      onSave({ phonemes: editablePhonemes, soundChanges: newRules });
      onClose();
    } catch (e) {
      setError(`Error saving: ${e.message}`);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <h2 className="text-3xl font-bold text-purple-800 dark:text-purple-200 mb-2 text-center">
          Phonology Settings
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          Define your phonemes and sound change rules. For rules, use 'V' for
          any vowel, 'C' for any consonant, '#' for word boundary, and '!' for
          negation.
        </p>
        {error && (
          <p className="bg-red-100 dark:bg-red-900 text-red-700 dark;text-red-300 p-3 rounded-md mb-4 text-center">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow min-h-0">
          {/* Column 1: Phonemes */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 flex-shrink-0">
              Phonemes
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex-grow overflow-y-auto">
              {editablePhonemes.map(
                (
                  p: {
                    orth: string | number | readonly string[] | undefined;
                    ipa: string | number | readonly string[] | undefined;
                    type: string | number | readonly string[] | undefined;
                  },
                  index: React.Key | null | undefined
                ) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-center mb-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded shadow-sm"
                  >
                    <input
                      value={p.orth}
                      onChange={(e) =>
                        handlePhonemeChange(index, "orth", e.target.value)
                      }
                      placeholder="Orth"
                      className="col-span-4 p-1 border rounded bg-white dark:bg-gray-700"
                    />
                    <input
                      value={p.ipa}
                      onChange={(e) =>
                        handlePhonemeChange(index, "ipa", e.target.value)
                      }
                      placeholder="IPA"
                      className="col-span-4 p-1 border rounded bg-white dark:bg-gray-700"
                    />
                    <select
                      value={p.type}
                      onChange={(e) =>
                        handlePhonemeChange(index, "type", e.target.value)
                      }
                      className="col-span-3 p-1 border rounded bg-white dark:bg-gray-700"
                    >
                      <option value="consonant">Consonant</option>
                      <option value="vowel">Vowel</option>
                    </select>
                    <button
                      onClick={() => handleDeletePhoneme(index)}
                      className="col-span-1 text-red-500 hover:text-red-700 font-bold"
                    >
                      X
                    </button>
                  </div>
                )
              )}
              <button
                onClick={handleAddPhoneme}
                className="mt-2 w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
              >
                Add Phoneme
              </button>
            </div>
          </div>
          {/* Column 2: Rules */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 flex-shrink-0">
              Sound Change Rules (JSON)
            </h3>
            <textarea
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              className="w-full h-full flex-grow p-2 border rounded-md font-mono text-sm bg-gray-50 dark:bg-gray-900"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-800 transition transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 dark:bg-green-400 text-white dark:text-black rounded-md hover:bg-green-700 dark:hover:bg-green-500 transition transform hover:scale-105"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
const DerivationsReferenceModal = ({
  derivationsReference,
  setDerivationsReference,
  onClose,
}) => {
  const [rows, setRows] = useState(
    derivationsReference.length > 0
      ? derivationsReference
      : [{ affix: "", type: "", meaning: "" }]
  );
  const handleChange = (idx: string | number, field: string, value: string) => {
    const updated = [...rows];
    updated[idx][field] = value;
    setRows(updated);
  };
  const addRow = () => setRows([...rows, { affix: "", type: "", meaning: "" }]);
  const removeRow = (idx: any) =>
    setRows(rows.filter((_: any, i: any) => i !== idx));

  const handleSave = () => {
    setDerivationsReference(
      rows.filter(
        (row: { affix: any; type: any; meaning: any }) =>
          row.affix || row.type || row.meaning
      )
    );
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex overflow-y-auto items-center justify-center z-50 p-4">
      <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-xl shadow-2xl max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Derivation Reference
        </h2>
        <div className="overflow-y-auto max-h-80 mb-4">
          <table className="min-w-full border mb-4">
            <thead>
              <tr>
                <th className="px-2 py-1 border">Affix</th>
                <th className="px-2 py-1 border">Type</th>
                <th className="px-2 py-1 border">Meaning</th>
                <th className="px-2 py-1 border"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(
                (
                  row: {
                    affix: string | number | readonly string[] | undefined;
                    type: string | number | readonly string[] | undefined;
                    meaning: string | number | readonly string[] | undefined;
                  },
                  idx: React.Key | null | undefined
                ) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">
                      <input
                        className="text-w-full p-1 border dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-800"
                        value={row.affix}
                        onChange={(e) =>
                          handleChange(idx, "affix", e.target.value)
                        }
                        placeholder="Affix"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        className="w-full p-1 border dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-800"
                        value={row.type}
                        onChange={(e) =>
                          handleChange(idx, "type", e.target.value)
                        }
                        placeholder="e.g. noun → verb"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        className="w-full p-1 border dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-800"
                        value={row.meaning}
                        onChange={(e) =>
                          handleChange(idx, "meaning", e.target.value)
                        }
                        placeholder="Meaning"
                      />
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        onClick={() => removeRow(idx)}
                        className="text-red-500 font-bold mt-1 hover:scale-105"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        <button
          onClick={addRow}
          className="w-full py-2 mb-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition transform hover:scale-105"
        >
          Add Row
        </button>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 transiiton dark:hover:bg-gray-700 transition transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 dark:bg-green-400 hover:bg-green-700 transiiton dark:hover:bg-green-500 transition text-white dark:text-black rounded transform hover:scale-105"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
const GrammarReferenceModal = ({
  onClose,
  setShowPronounsReference,
  setShowNounsReference,
  setShowVerbsReference,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex overflow-y-auto items-center justify-center z-50 p-4">
      <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-xl shadow-2xl max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Grammar</h2>
        <div className="overflow-y-auto max-h-80 mb-4 space-y-2">
          <button
            onClick={() => setShowPronounsReference(true)}
            className="w-full py-2 px-6 bg-neutral-400 dark:bg-neutral-600 text-black dark:text-white rounded-lg shadow-md hover:bg-neutral-500 dark:hover:bg-neutral-500 transform hover:scale-105 transition"
          >
            Pronouns
          </button>
          <button
            onClick={() => setShowNounsReference(true)}
            className="w-full py-2 px-6 bg-neutral-400 dark:bg-neutral-600 text-black dark:text-white rounded-lg shadow-md hover:bg-neutral-500 dark:hover:bg-neutral-500 transform hover:scale-105 transition"
          >
            Nouns
          </button>
          <button
            onClick={() => setShowVerbsReference(true)}
            className="w-full py-2 px-6 bg-neutral-400 dark:bg-neutral-600 text-black dark:text-white rounded-lg shadow-md hover:bg-neutral-500 dark:hover:bg-neutral-500 transform hover:scale-105 transition"
          >
            Verbs
          </button>
          <button
            onClick={onClose}
            className="mt-8 w-full py-3 px-6 bg-indigo-600 dark:bg-indigo-400 text-white rounded-lg shadow-md  transition hover:bg-indigo-700 transition dark:hover:bg-indigo-500 transition font-bold transform hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
const GrammarNotesModal = ({
  title,
  notes,
  setNotes,
  isGenerating,
  onGenerate,
  onClose,
}) => {
  const [localNotes, setLocalNotes] = useState(notes);
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleSave = () => {
    setNotes(localNotes);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <h2 className="text-2xl font-bold mb-4 text-center">{title}</h2>
        <div className="flex-grow overflow-y-auto mb-4">
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            rows={15}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-gray-800 dark:text-gray-200"
            placeholder="Write your notes here, or generate them with AI..."
          />
        </div>
        <div className="flex justify-between items-center flex-shrink-0">
          <button
            onClick={() =>
              onGenerate(title.toLowerCase(), localNotes, setNotes)
            }
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-wait transition"
          >
            {isGenerating ? (
              <>
                <Spinner /> Generating...
              </>
            ) : (
              "✨ Generate Notes"
            )}
          </button>
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 transition dark:hover:bg-gray-800 transition transform hover:scale-105 rounded shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 dark:bg-green-400 hover:bg-green-700 transition dark:hover:bg-green-500 transition transform hover:scale-105 text-white dark:text-black rounded"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
const PronounsReferenceModal = ({
  pronounNotes,
  setPronounNotes,
  isGenerating,
  onGenerate,
  onClose,
}) => {
  return (
    <GrammarNotesModal
      title="Pronouns"
      notes={pronounNotes}
      setNotes={setPronounNotes}
      isGenerating={isGenerating}
      onGenerate={onGenerate}
      onClose={onClose}
    />
  );
};
const NounsReferenceModal = ({
  nounNotes,
  setNounNotes,
  isGenerating,
  onGenerate,
  onClose,
}) => {
  return (
    <GrammarNotesModal
      title="Nouns"
      notes={nounNotes}
      setNotes={setNounNotes}
      isGenerating={isGenerating}
      onGenerate={onGenerate}
      onClose={onClose}
    />
  );
};
const VerbsReferenceModal = ({
  verbNotes,
  setVerbNotes,
  isGenerating,
  onGenerate,
  onClose,
}: {
  isGenerating: boolean;
  onGenerate: () => void;
  onClose: () => void;
}) => {
  return (
    <GrammarNotesModal
      title="Verbs"
      notes={verbNotes}
      setNotes={setVerbNotes}
      isGenerating={isGenerating}
      onGenerate={onGenerate}
      onClose={onClose}
    />
  );
};
export default App;
