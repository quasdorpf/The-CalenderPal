from pydantic import BaseModel, Field
from google import genai
from enum import Enum
from datetime import time
from typing import List


# if not os.getenv('GEMINI_API_KEY'):
#         raise ValueError("GEMINI_API_KEY environment variable is not set.")

class DayOfWeek(str, Enum):
    """
    Represents the days of the week for scheduling.
    Using an Enum ensures only valid day names are used.
    """
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"

# 2. Define the Pydantic Schema for a Scheduled Class
class EventInfo(BaseModel):
    """
    Pydantic schema for storing information about a scheduled class.
    """
    days: DayOfWeek = Field(description = "the days of the week allocated.", min_length=1)
    
    start_time: time = Field(description = "The time the event starts.")
    
    end_time: time = Field(description = "The time the class ends.")

    pass

def create_new_event():

    prompt = (
            "You are an expert event parser. Process the following list of "
            "unstructured calendar event descriptions. For each description, "
            "extract the summary, location, description, and the start and end times. "
            "The start and end times MUST be in the **RFC3339** format, "
            "e.g., '2025-10-27T10:00:00-04:00'. If a timezone isn't specified, "
            "assume 'America/New_York'. Combine all extracted events into a single "
            "JSON object that adheres strictly to the provided Pydantic schema."
            f"\n\nUnstructured Event List:\n{json.dumps(raw_text_list, indent=2)}"
        )
        

    client = genai.Client(api_key="AIzaSyATNpKIY_NAYT38szXMAsU2UGBdlUBC9Aw")
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="",
            config={
                "response_mime_type": "application/json",
                "response_schema": list[EventInfo],
            },
        )
    except Exception as e:
            print(f"Error during extraction: {e}")

    # Use the response as a JSON string.
    print(response.text)

    # Use instantiated objects.