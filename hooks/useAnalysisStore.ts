import { create } from "zustand";
import {
  AdvancedSettings,
  DEFAULT_SETTINGS,
} from "@/components/AdvancedSettings";
import { Doctor, PriorityLevel } from "@prisma/client";
import { getKeywordGroups } from "@/lib/keyword-actions";
import {
  enhancedKeywordMatch,
  performCrossGroupAnalysis,
  KeywordGroup,
  MultiGroupAnalysisResult,
  CrossGroupMatch,
} from "@/lib/analysis-utils";

interface AnalysisResult {
  priority: PriorityLevel;
  score: number;
  department: string;
  doctor: string;
  keywords: string[];
  reasoning: string[];
  override?: boolean;
}

interface AnalysisState {
  // Input State
  appointmentNote: string;
  patientId: string;
  isCustomOverride: boolean;

  // Settings
  settings: AdvancedSettings;

  // Data
  keywordGroups: KeywordGroup[];
  doctors: Doctor[];
  doctorLoadFactors: Record<string, number>;

  // Analysis Output
  result: AnalysisResult | null;
  multiGroupResult: MultiGroupAnalysisResult | null;
  isAnalyzing: boolean;

  // Notification System
  toastMessage: {
    title: string;
    description: string;
    type: "success" | "warning" | "error" | "info";
  } | null;

  // Actions
  setNote: (note: string) => void;
  setPatientId: (id: string) => void;
  setSettings: (settings: AdvancedSettings) => void;
  setDoctors: (doctors: Doctor[]) => void;
  setDoctorLoadFactors: (factors: Record<string, number>) => void;
  setIsCustomOverride: (isOverride: boolean) => void;
  loadKeywordGroups: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  dismissToast: () => void;
  reset: () => void;
}

// Timeout reference outside store to persist between renders/actions
let analysisTimeout: NodeJS.Timeout | null = null;

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  // Initial State
  appointmentNote: "",
  patientId: "",
  isCustomOverride: false,
  settings: DEFAULT_SETTINGS,
  keywordGroups: [],
  doctors: [],
  doctorLoadFactors: {},
  result: null,
  multiGroupResult: null,
  isAnalyzing: false,
  toastMessage: null,

  // Actions
  setNote: (note) => {
    set({ appointmentNote: note });

    // Debounce analysis to avoid excessive calls during typing (300ms)
    if (analysisTimeout) clearTimeout(analysisTimeout);

    analysisTimeout = setTimeout(() => {
      get().runAnalysis();
    }, 300);
  },

  setPatientId: (id) => set({ patientId: id }),

  setSettings: (settings) => {
    set({ settings });
    get().runAnalysis();
  },

  setDoctors: (doctors) => set({ doctors }),

  setDoctorLoadFactors: (factors) => set({ doctorLoadFactors: factors }),

  setIsCustomOverride: (isOverride) => set({ isCustomOverride: isOverride }),

  loadKeywordGroups: async () => {
    try {
      const groups = await getKeywordGroups();
      if (groups) {
        // Map the data to match expected KeywordGroup interface
        const mappedGroups = groups.map(
          (group: Awaited<ReturnType<typeof getKeywordGroups>>[number]) => ({
            ...group,
            description: group.description ?? undefined,
            keywords: group.keywords || [],
          })
        ) as KeywordGroup[];

        set({ keywordGroups: mappedGroups });
      }
    } catch (error) {
      console.error("Failed to load keyword groups", error);
      set({
        toastMessage: {
          title: "Error",
          description: "Failed to load keyword configuration",
          type: "error",
        },
      });
    }
  },

  runAnalysis: async () => {
    const {
      appointmentNote,
      keywordGroups,
      settings,
      isCustomOverride,
      doctorLoadFactors,
      doctors,
    } = get();

    // Allow analysis to proceed even if keywordGroups is empty (will trigger fallback logic)
    if (!appointmentNote.trim() || isCustomOverride) {
      return;
    }

    set({ isAnalyzing: true });

    // Note: Removed artificial delay - loading state shows naturally during async operations

    try {
      // 1. Cross-Group Analysis
      const crossGroupResult = performCrossGroupAnalysis(
        appointmentNote,
        keywordGroups,
        settings
      );
      set({ multiGroupResult: crossGroupResult });

      let bestMatch: {
        group: KeywordGroup | CrossGroupMatch;
        score: number;
        matchedKeywords: string[];
      } | null = null;

      // Use cross-group result if available and valid
      if (crossGroupResult && crossGroupResult.hasCrossGroupMatches) {
        bestMatch = {
          group: crossGroupResult.primaryGroup,
          score: crossGroupResult.combinedScore,
          matchedKeywords: crossGroupResult.primaryGroup.matchedKeywords,
        };
      } else {
        // Fallback to standard single-group analysis logic
        // (Simplified version of what was in the component)
        let highestScore = 0;

        keywordGroups.forEach((group) => {
          if (!group.isActive) return;

          let groupScore = 0;
          const matches: string[] = [];

          group.keywords.forEach((keyword) => {
            if (!keyword.isActive) return;
            const match = enhancedKeywordMatch(
              appointmentNote,
              keyword,
              settings
            );
            if (match.isMatch) {
              groupScore +=
                match.confidence * match.contextModifier * keyword.weight;
              matches.push(keyword.text);
            }
          });

          if (matches.length > 0) {
            // Apply base score and sensitivity
            const finalScore =
              (groupScore + group.baseScore * 0.3) *
              (settings.sensitivityLevel / 100);

            if (finalScore > highestScore) {
              highestScore = finalScore;
              bestMatch = {
                group: group,
                score: Math.min(100, finalScore),
                matchedKeywords: matches,
              };
            }
          }
        });
      }

      if (bestMatch) {
        // Determine recommended doctor based on department and load
        const recommendedDept = bestMatch.group.department;
        const score = Math.round(bestMatch.score);

        // Find best doctor match in the recommended department
        const matchingDocs = doctors.filter(
          (d) =>
            d.department === recommendedDept ||
            d.specialization === recommendedDept
        );

        let selectedDoctorId = "";
        let finalDepartment = recommendedDept;
        let routingReason = `Matched with ${recommendedDept} based on symptom analysis.`;

        if (matchingDocs.length > 0) {
          // Specialist Available: Sort by Least Loaded
          const bestDoc = matchingDocs.sort((a, b) => {
            const loadA = doctorLoadFactors[a.id] || 0;
            const loadB = doctorLoadFactors[b.id] || 0;
            return loadA - loadB;
          })[0];
          selectedDoctorId = bestDoc.id;
        } else {
          // Specialist Unavailable: Fallback to Internal Medicine / General Practice
          // This handles the "No Doctors in Department" edge case
          const generalDocs = doctors.filter(
            (d) =>
              d.department?.toLowerCase().includes("general") ||
              d.department?.toLowerCase().includes("internal") ||
              d.department?.toLowerCase().includes("family")
          );

          if (generalDocs.length > 0) {
            // Sort GPs by load
            const bestGP = generalDocs.sort((a, b) => {
              const loadA = doctorLoadFactors[a.id] || 0;
              const loadB = doctorLoadFactors[b.id] || 0;
              return loadA - loadB;
            })[0];

            selectedDoctorId = bestGP.id;
            finalDepartment = bestGP.department || "General Practice"; // Update dept to match the actual doctor
            routingReason = `No ${recommendedDept} specialist available. Re-routed to ${bestGP.department} for initial evaluation.`;
          }
        }

        set({
          result: {
            priority:
              score >= 80
                ? PriorityLevel.EMERGENCY
                : score >= 50
                  ? PriorityLevel.URGENT
                  : PriorityLevel.NORMAL,
            score,
            department: finalDepartment,
            doctor: selectedDoctorId,
            keywords: bestMatch.matchedKeywords || [],
            reasoning: [routingReason],
            override: false,
          },
          multiGroupResult: crossGroupResult || null,
        });
      } else {
        // No match found -> Default to General/Normal
        // This handles the "Unregistered Keyword" case by providing a safe fallback

        // Find all General Practitioners or Internal Medicine doctors
        const generalDocs = doctors.filter(
          (d) =>
            d.department?.toLowerCase().includes("general") ||
            d.specialization?.toLowerCase().includes("general") ||
            d.department?.toLowerCase().includes("internal") ||
            d.department?.toLowerCase().includes("family")
        );

        // "Smart Assignment": Sort by workload (lowest first)
        // If load is unknown, default to 0
        const selectedDoc = generalDocs.sort((a, b) => {
          const loadA = doctorLoadFactors[a.id] || 0;
          const loadB = doctorLoadFactors[b.id] || 0;
          return loadA - loadB;
        })[0];

        if (!selectedDoc && doctors.length > 0) {
          set({
            toastMessage: {
              title: "No Available Doctor",
              description:
                "No General Practitioner found. Please select a doctor manually.",
              type: "warning",
            },
          });
        }

        set({
          result: {
            priority: PriorityLevel.NORMAL,
            score: 0,
            department: selectedDoc?.department || "General Practice",
            doctor: selectedDoc?.id || "",
            keywords: [],
            reasoning: [
              "No specific symptoms detected.",
              selectedDoc?.department
                ? `Routing to ${selectedDoc.department} based on availability.`
                : "Routing to General Practice based on availability.",
            ],
            override: false,
          },
          multiGroupResult: null,
        });
      }
    } catch (error) {
      console.error(
        "Analysis failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      set({ isAnalyzing: false });
    }
  },

  dismissToast: () => set({ toastMessage: null }),

  reset: () =>
    set({
      appointmentNote: "",
      result: null,
      multiGroupResult: null,
      isCustomOverride: false,
      toastMessage: null,
    }),
}));
