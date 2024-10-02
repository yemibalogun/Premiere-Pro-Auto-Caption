
$.runScript = {
	// Utility function to serialize objects into string representations
	serialize: function (obj) {
		var str = '';
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				var value = obj[key];
				if (value && typeof value === 'object') {
					str += key + ': ' + this.serialize(value) + ', ';
				} else {
					str += key + ': ' + value + ', ';
				}
			}
		}
		return str.slice(0, -2); // Remove the last comma and space
	},

	// Function to save the current project
	saveProject: function () {
		app.project.save();
	},

	// Function to handle file imports through a dialog
	importFiles: function () {
		var filterString = "";
		if (Folder.fs === 'Windows') {
			filterString = "All files:*.*";
		}
		if (app.project) {
			var fileOrFilesToImport = File.openDialog("Choose files to import", filterString, true);
			if (fileOrFilesToImport) {
				var importThese = [];
				if (importThese) {
					for (var i = 0; i < fileOrFilesToImport.length; i++) {
						importThese[i] = fileOrFilesToImport[i].fsName;
					}
					var suppressWarnings = true;
					var importAsStills = false;
					app.project.importFiles(importThese, suppressWarnings, app.project.getInsertionBin(), importAsStills);
				}
			} else {
				$.updateEventPanel("No files to import.");
			}
		}
	},

	// Function to find or create the "Main folder" in the project
	findOrCreateMainFolder: function() {
		var projectRoot = app.project.rootItem;
		var mainFolder = null;

		// Search for "Main folder" in the project
		for (var i = 0; i < projectRoot.children.numItems; i++) {
			var child = projectRoot.children[i];
			if (child.type === ProjectItemType.BIN && child.name === "Main folder") {
				mainFolder = child;

				// Delete Main folder if it exists
				this.deleteFolderContents(mainFolder);
				break;
			}
		}

		// Create a new "Main folder" if it doesn't exist
		if (!mainFolder) {
			mainFolder = projectRoot.createBin("Main folder");
		}
		return mainFolder;
	},

	// Function to import folder structure into the project
	importFolderStructure: function() {
		$.writeln('Starting importFolderStructure');
		var rootFolder = Folder.selectDialog("Select the root folder to import");

		if (rootFolder != null) {
			var mainFolder = this.findOrCreateMainFolder();
			var importedFolders = [];

			// Add debug statement before importFolder call
			$.writeln('Calling importFolder with rootFolder: ' + rootFolder.fsName);
			this.importFolder(rootFolder.fsName, mainFolder, importedFolders);

			// Debug: Log the imported folders array
			$.writeln('Imported folders: ' + this.serialize(importedFolders));

			this.importedFolders = importedFolders;

			// Debug: Log the this.importedFolders to ensure it's assigned
			$.writeln('this.importedFolders: ' + this.serialize(this.importedFolders));
		} else {
			$.writeln('No folder selected.');
		}
		$.writeln('Saving project');
		this.saveProject();

		$.writeln('Finished importFolderStructure');
		$.writeln('...........................................................');
	},

	deleteFolderContents: function(folder) {
		// First, delete all items in the root of the folder (files and subfolders)
		for (var i = folder.children.numItems - 1; i >= 0; i--) {
			var child = folder.children[i];

			writeln('chile.type: ' + child.type + 'ProjectItemType.BIN: ' + ProjectItemType.BIN);
			try {
				// Check if the item is a bin (subfolder) and recursively delete its contents
				if (child.type === ProjectItemType.BIN) {
					this.deleteFolderContents(child); // Recursively delete contents of the subfolder
					child.remove(); // Remove the empty subfolder
				} else {
					child.remove(); // Remove the file
				}
			} catch (e) {
				$.writeln("Error removing item: " + child.name + " " + e);
			}
		}
	},
	

	importFolder: function(folderPath, parentItem, importedFolders) {
		$.writeln('Importing folder: ' + folderPath);
		var folder = new Folder(folderPath);
		var files = folder.getFiles();
	
		// Ensure parentItem is a bin
		if (!(parentItem instanceof ProjectItem) || parentItem.type !== ProjectItemType.BIN) {
			$.writeln('Parent item is not a bin: ' + parentItem.name);
			return;
		}
	
		// Iterate through files in the folder
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
	
			if (file instanceof Folder) {
				// Replace %20 with spaces in the folder name
				var folderName = file.name.replace(/%20/g, ' ');
				
				$.writeln('Found subfolder: ' + folderName);
				var subFolderBin = parentItem.createBin(folderName);
				this.importFilesInSubFolder(file.fsName, subFolderBin, importedFolders);
			}
		}
	},
	
	importFilesInSubFolder: function(subFolderPath, subFolderBin, importedFolders) {
		var subFolder = new Folder(subFolderPath);
		var subFolderFiles = subFolder.getFiles();
		var mp4File = null;
		var pngFile = null;
	
		for (var j = 0; j < subFolderFiles.length; j++) {
			var subFolderFile = subFolderFiles[j];
	
			if (subFolderFile instanceof File) {
				$.writeln('Found file: ' + subFolderFile.name);
	
				// Import files into the bin
				if (subFolderFile.name.match(/\.(mp4|mov)$/i)) {
					mp4File = subFolderFile;
				} else if (subFolderFile.name.match(/\.png$/i)) {
					pngFile = subFolderFile;
				}
	
				app.project.importFiles([subFolderFile.fsName], false, subFolderBin, false);
			}
		}
	
		// Add folder details to importedFolders
		if (mp4File && pngFile) {
			importedFolders.push({
				folderName: subFolder.name,
				mp4File: mp4File,
				pngFile: pngFile
			});
			$.writeln('Imported folder details: ' + this.serialize(importedFolders[importedFolders.length - 1]));
		}
	},

	exportAudio: function () {
		$.writeln('Starting exportAudio function.')
		var sequence = app.project.activeSequence;

		if (!sequence) {
			$.writeln('Sequence not found: ' + sequence.name);
			return;
		}
		$.writeln('Sequence found: ' + sequence.name)

		try {
			var outputPresetPath = "C:\\Users\\OMEN 15 Pro\\Documents\\Adobe\\Adobe Media Encoder\\23.0\\Presets\\yemi_audio_preset.epr";
			var outputFilePath= "C:\\Users\\OMEN 15 Pro\\Videos\\Exported_audio\\" // output folder

			var audioOutput = outputFilePath + 'new_audio' + ".wav";
			// Export audio track
			sequence.exportAsMediaDirect(audioOutput, outputPresetPath, 0);
		} catch (error) {
			$.writeln('Error exporting audio: ' + error.message);
		}
		
		$.writeln('Audio exported successfully.');

	},

	addCaptionToSequence: function (sequenceName, captions, startTime, getSequenceEndTime) {
		var project = app.project;
		var sequence = project.sequences[sequenceName];

		if (!sequence) {
			$.writeln('Sequence not found.');
			return;
		}

		var captionTrack = sequence.addCaptionTrack();

		for (var i = 0; i < captions.length; i++) {
			var caption = captionTrack.createCaptionItem(captions[i], startTime, endTime);
			caption.start = startTime + i * 3; // Just for example
			caption.end = startTime + (i+1)*3;
		}

		$.writeln('Captions added successfully.');
	},


	automatePermutations: function () {
		$.writeln('Starting automatePermutations function.');
		
		// Find the "Main folder"
		var mainFolder = this.findBinByName("Main folder");
		if (!mainFolder) {
			$.writeln("Main folder not found in the project.");
			return;
		}
	
		// Find bins inside the "Main folder"
		var beginningBin = this.findBinByNameInFolder(mainFolder, "Beginning Footage");
		var middleBin = this.findBinByNameInFolder(mainFolder, "Middle Footage");
		var endingBin = this.findBinByNameInFolder(mainFolder, "Ending Footage");
	
		if (!beginningBin || !middleBin || !endingBin) {
			alert("One or more bins (Beginning, Middle, or Ending) not found in the Main folder.");
			return;
		}
	
		var beginningClips = beginningBin.children;
		var middleClips = middleBin.children;
		var endingClips = endingBin.children;
	
		if (beginningClips.length === 0 || middleClips.length === 0 || endingClips.length === 0) {
			alert("One or more bins are empty. Please ensure all bins have clips.");
			return;
		}
	
		var sequenceCounter = 1;

		// Iterate through the clips and generate permutations
		for (var i = 0; i < beginningClips.length; i++) {
			for (var j = 0; j < middleClips.length; j++) {
				for (var k = 0; k < endingClips.length; k++) {

					var sequenceName = "main_sequence";
					var sequence = this.findSequenceByName(sequenceName);

					if (!sequence) {
						$.writeln('Sequence named "' + sequenceName + '" not found');
						return;
					}

					$.writeln('Sequence found: ' + sequence.name);

					var videoTracks = sequence.videoTracks;
					var audioTracks = sequence.audioTracks;

					// Process only the first video and audio tracks
					var firstTrack = videoTracks[0];
					var firstAudio = audioTracks[0];
					$.writeln('Processing first track: ' + firstTrack.name);
				
					// Check if there are any clips in the first track
					if (firstTrack.clips.numItems > 0) {
						$.writeln('Found ' + firstTrack.clips.numItems + ' videos in the first track. Removing all videos.');
				
						// Remove all clips from the first video and audio tracks
						for (var a = firstTrack.clips.numItems - 1; a >= 0; a--) {
							firstTrack.clips[a].remove(true, true);
						}
				
						for (var b = firstAudio.clips.numItems - 1; b >= 0; b--) {
							firstAudio.clips[b].remove(true, true);
						}
				
						$.writeln('All clips removed from ' + firstTrack.name);
					} else {
						$.writeln('First track is empty. Ready to add new video.');
					}
					
					// Create a new sequence for each permutation
					var clipName = "Video_" + sequenceCounter;
					// var presetPath = "C:\\Users\\OMEN 15 Pro\\Documents\\Adobe\\Premiere Pro\\23.0\\Profile-OMEN 15 Pro\\Settings\\Custom\\yemi_full_res.sqpreset";
					
					// Add the first clip (Beginning)
					try {
						this.addClipToSequence(beginningClips[i], sequence, 0);
						
						// Add the second clip (Middle)
						this.addClipToSequence(middleClips[j], sequence, this.getSequenceEndTime(sequence));
						
						// Add the third clip (Ending)
						this.addClipToSequence(endingClips[k], sequence, this.getSequenceEndTime(sequence));
						
						$.writeln('All 3 clips added to sequence: ' + sequence.name);
						
					} catch (error) {
						$.writeln("Error adding clips to sequence: " + error.message);
						continue;  // Move to the next permutation if adding clips fails
					}

					// Now queue the sequence to AME after ensuring all clips are added
					this.queueSequenceToAME(sequenceName, clipName);

					sequenceCounter++;
				}
			}
		}
		alert("All permutations created. Total sequences: " + (sequenceCounter - 1));
	},
	

	// Function to find a bin by name inside a folder
	findBinByNameInFolder: function (parentFolder, name) {
		for (var i = 0; i < parentFolder.children.numItems; i++) {
			if (parentFolder.children[i].name === name) {
				return parentFolder.children[i];
			}
		}
		return null;
	},

	// Function to find a bin by name
	findBinByName: function (name) {
		var projectRoot = app.project.rootItem;
		for (var i = 0; i < projectRoot.children.numItems; i++) {
			if (projectRoot.children[i].name == name) {
				return projectRoot.children[i];
			}
		}
		return null;
	},


	// Function to add clip to sequence at a specified time
	addClipToSequence: function (clip, sequence, time) {
		var videoTrack = sequence.videoTracks[0];
		videoTrack.insertClip(clip, time);
	},

	// Function to get the end time of a sequence
	getSequenceEndTime: function (sequence) {
		var videoTrack = sequence.videoTracks[0];
		if (videoTrack.clips.numItems > 0) {
			var lastClip = videoTrack.clips[videoTrack.clips.numItems - 1];
			return lastClip.end.seconds;
		} else {
			return 0; // If there are no clips in the track, return 0
		}
	},

	// Function to retrieve a sequence by name
	findSequenceByName: function (sequenceName) {
		var sequences = app.project.sequences;
		$.writeln('Looking for sequence: ' + sequenceName);

		for (var i = 0; i < sequences.length; i++) {
			var sequence = sequences[i];
			if (sequence.name === sequenceName) {
				$.writeln('Found sequence: ' + sequenceName);
				return sequence;
			}
		}

		$.writeln('Sequence not found: ' + sequenceName);
		return null; // Return null if no matching sequence is found
	},

	findSequenceByName: function(name) {
        for (var i = 0; i < app.project.sequences.numSequences; i++) {
            if (app.project.sequences[i].name === name) {
                return app.project.sequences[i];
            }
        }
        return null;
    },

	// Function export a sequence
	queueSequenceToAME: function (sequenceName, clipName) {
		$.writeln('Starting exportSequence with sequence name: ' + clipName);

		// Save the project
		app.project.save();
		$.writeln('Project saved.');

		var outputFolder = "C:\\Users\\OMEN 15 Pro\\Videos\\Permutations\\";
		var outputFilePath = outputFolder + clipName + ".mp4"; // update the format as needed
		var presetPath = "C:\\Users\\OMEN 15 Pro\\Documents\\Adobe\\Adobe Media Encoder\\23.0\\Presets\\yemi_full_res.epr";

		var sequence = this.findSequenceByName(sequenceName);

		if (!sequence) {
			$.writeln('Sequence named "' + sequence.name + '" not found');
			return;
		}
	
		$.writeln('Sequence found: ' + sequence.name);

		// Export the sequence from Premiere PRO using Media Encoder.
		try {
			var sequence = sequence;

			// Add the sequence to the AME queue
			app.encoder.encodeSequence(
				sequence, // The sequence to be encoded
				outputFilePath, // Destination path
				presetPath,     // Encoding preset path
				0,               // Work Area (1 for entire sequence)
				1               // If 1, job will be removed once complete
			);

			app.encoder.startBatch();

		} catch (e) {
			$.writeln('Error exporting sequence: ' + e.message);
		}
		$.writeln('Finished queueSequenceToAME');
	
	},

	updateEventPanel : function (message) {
		app.setSDKEventMessage(message, 'info');
		/*app.setSDKEventMessage('Here is some information.', 'info');
		app.setSDKEventMessage('Here is a warning.', 'warning');
		app.setSDKEventMessage('Here is an error.', 'error');  // Very annoying; use sparingly.*/
	},

}	