from enum import Enum


class MoodLevel(str, Enum):
    GREAT = "great"
    GOOD = "good"
    NEUTRAL = "neutral"
    BAD = "bad"
    TERRIBLE = "terrible"


class PainLevel(int, Enum):
    NONE = 0
    MILD = 3
    MODERATE = 5
    SEVERE = 7
    EXTREME = 10


class FamilyPermission(str, Enum):
    VIEW_CHECKINS = "view_checkins"
    VIEW_MEDICINES = "view_medicines"
    VIEW_HEALTH_SCORES = "view_health_scores"
    VIEW_LAB_REPORTS = "view_lab_reports"
    RECEIVE_SOS = "receive_sos"
    MANAGE_MEDICINES = "manage_medicines"
    FULL_ACCESS = "full_access"


class MedicineFrequency(str, Enum):
    ONCE_DAILY = "once_daily"
    TWICE_DAILY = "twice_daily"
    THRICE_DAILY = "thrice_daily"
    EVERY_X_HOURS = "every_x_hours"
    AS_NEEDED = "as_needed"
    WEEKLY = "weekly"


class MedicineCategory(str, Enum):
    # Prescription required
    ANTIHYPERTENSIVE = "antihypertensive"
    ANTIDIABETIC = "antidiabetic"
    ANTIBIOTIC = "antibiotic"
    ANTIDEPRESSANT = "antidepressant"
    ANTICOAGULANT = "anticoagulant"
    HORMONAL = "hormonal"
    CARDIAC = "cardiac"
    NEUROLOGICAL = "neurological"
    IMMUNOSUPPRESSANT = "immunosuppressant"
    ONCOLOGY = "oncology"
    OTHER_PRESCRIBED = "other_prescribed"

    # Emergency / First-aid — NO prescription required
    PAIN_RELIEVER = "pain_reliever"
    ANTIHISTAMINE = "antihistamine"
    ANTACID = "antacid"
    ORS = "ors"
    ANTISEPTIC = "antiseptic"
    EMERGENCY_CARDIAC = "emergency_cardiac"
    FIRST_AID = "first_aid"
    VITAMIN_SUPPLEMENT = "vitamin_supplement"
    ANTIDIARRHEAL = "antidiarrheal"
    COLD_FLU = "cold_flu"


EMERGENCY_CATEGORIES: set[MedicineCategory] = {
    MedicineCategory.PAIN_RELIEVER,
    MedicineCategory.ANTIHISTAMINE,
    MedicineCategory.ANTACID,
    MedicineCategory.ORS,
    MedicineCategory.ANTISEPTIC,
    MedicineCategory.EMERGENCY_CARDIAC,
    MedicineCategory.FIRST_AID,
    MedicineCategory.VITAMIN_SUPPLEMENT,
    MedicineCategory.ANTIDIARRHEAL,
    MedicineCategory.COLD_FLU,
}


class OrganType(str, Enum):
    HEART = "heart"
    BRAIN = "brain"
    GUT = "gut"
    LUNGS = "lungs"


class WearablePlatform(str, Enum):
    APPLE_HEALTH = "apple_health"
    GOOGLE_FIT = "google_fit"


class LabReportStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PARSED = "parsed"
    FAILED = "failed"


class PrescriptionStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PARSED = "parsed"
    FAILED = "failed"


class SOSStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"


class SOSSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AdherencePeriod(str, Enum):
    SEVEN_DAYS = "7d"
    THIRTY_DAYS = "30d"
    NINETY_DAYS = "90d"


class ScoreTrend(str, Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


class InsightType(str, Enum):
    TREND_ALERT = "trend_alert"
    SYMPTOM_PATTERN = "symptom_pattern"
    MEDICINE_TIMING = "medicine_timing"
    LAB_FOLLOWUP = "lab_followup"
    CONDITION_MANAGEMENT = "condition_management"
    SEASONAL = "seasonal"
    HYDRATION = "hydration"
    SLEEP_DEBT = "sleep_debt"
    MEDICATION_REVIEW = "medication_review"


class InsightSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"
