import openai
import os 
import time
from watchdog.observers import Observer 
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv

# Load environment variabes from .env file
load_dotenv()

# Set your OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")

# Set the API key for the OpenAI client
openai.api_key = api_key

# Directory to monitor
export_folder = "C:\\Users\\OMEN 15 Pro\\Videos\\Exported_audio\\"
file_to_watch = "new_audio.wav"  # The specific file you're expecting

def transcribe_audio(file_path):
    print(f"Translating audio file: {file_path}")
    
    # Adding a delay to ensure the file is ready for reading 
    time.sleep(5) # Adjust the delay time if necessary
    
    try:
        with open(file_path, 'rb') as audio_file:
            translation = openai.Audio.translate(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json"
            )
            print(translation.words)
        return translation['segments']
    except openai.OpenAIError as e:
        print(f"An error occurred while transcribing the audio: {e}")
        return None
    except PermissionError:
        print(f"Permission denied while trying to access {file_path}.")
        return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

# Function to save the translation into an SRT file
def save_to_srt(segments, output_srt_file):
    with open(output_srt_file, 'w', encoding='utf-8') as srt_file:
        for idx, segment in enumerate(segments):
            # Get start and end times
            start_time = segment['start']
            end_time = segment['end']
            text = segment['text'].strip()

            # Format time as hours:minutes:seconds,milliseconds
            start_time_srt = format_srt_time(start_time)
            end_time_srt = format_srt_time(end_time)

            # Write to the SRT file
            srt_file.write(f"{idx + 1}\n")
            srt_file.write(f"{start_time_srt} --> {end_time_srt}\n")
            srt_file.write(f"{text}\n\n")

    print(f"SRT file saved at {output_srt_file}")

# Function to format time for SRT file (hours:minutes:seconds,milliseconds)
def format_srt_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"

# Define an event handler for file creation/modification
class AudioHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(file_to_watch):
            print(f"Detected audio file saved: {event.src_path}")
            segments = transcribe_audio(event.src_path)
            print("Translation done. Saving to SRT...")
            output_srt = os.path.splitext(event.src_path)[0] + ".srt"
            save_to_srt(segments, output_srt)
            
    def on_created(self, event):
        if event.src_path.endswith(file_to_watch):
            print(f"Detected new audio file: {event.src_path}")
            segments = transcribe_audio(event.src_path)
            print("Translation done. Saving to SRT...")
            output_srt = os.path.splitext(event.src_path)[0] + ".srt"
            save_to_srt(segments, output_srt)
            
# Function to start monitoring the folder 
def monitor_folder():
    event_handler = AudioHandler()
    observer = Observer()
    observer.schedule(event_handler, path=export_folder, recursive=False)
    observer.start()
    print(f"Monitoring folder: {export_folder}")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
    
if __name__=="__main__":
    monitor_folder()