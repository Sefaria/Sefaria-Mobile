module Fastlane
    module Actions
        module SharedValues
            ANDROID_VERSION_NAME = :ANDROID_VERSION_NAME
        end

        class IncrementAndroidVersionNameAction < Action
            def self.run(params)
                path = params[:path]
                type = params[:type]

                major = 0
                foundMajor = false
                minor = 0
                foundMinor = false
                patch = 0
                foundPatch = false

                data = File.read(path)
                data.each_line do |line|
                    if (line.start_with?("def VERSION_MAJOR"))
                        foundMajor = true
                        major = line.delete("def VERSION_MAJOR=").to_i
                    elsif (line.start_with?("def VERSION_MINOR"))
                        foundMinor = true
                        minor = line.delete("def VERSION_MINOR=").to_i
                    elsif (line.start_with?("def VERSION_PATCH"))
                        foundPatch = true
                        patch = line.delete("def VERSION_PATCH=").to_i
                    end
                end

                if (!foundMajor)
                    UI.error "VERSION_MAJOR not found in build.gradle file, please ensure file contains 'def VERSION_MAJOR=0' declaration"
                    raise "Illegal Argument Exception : No VERSION_MAJOR variable in build.gradle file"
                end
                if (!foundMinor)
                    UI.error "VERSION_MINOR not found in build.gradle file, please ensure file contains 'def VERSION_MINOR=0' declaration"
                    raise "Illegal Argument Exception : No VERSION_MINOR variable in build.gradle file"
                end
                if (!foundPatch)
                    UI.error "VERSION_PATCH not found in build.gradle file, please ensure file contains 'def VERSION_PATCH=0' declaration"
                    raise "Illegal Argument Exception : No VERSION_PATCH variable in build.gradle file"
                end

                if (type.casecmp("major").zero?)
                    major = major + 1
                    minor = 0
                    patch = 0
                elsif (type.casecmp("minor").zero?)
                    minor = minor + 1
                    patch = 0
                elsif (type.casecmp("patch").zero?)
                    patch = patch + 1
                elsif(!type.casecmp("none").zero?)
                    UI.error "Please specify the version name value to increase (major|minor|patch|none)"
                    raise "IllegalArgumentException : No valid version name value provided"
                end

                updated_data = data
                data.each_line do |line|
                    if (line.start_with?("def VERSION_MAJOR"))
                        updated_data = updated_data.gsub(line, "def VERSION_MAJOR=#{major}\r\n")
                    elsif (line.start_with?("def VERSION_MINOR"))
                        updated_data = updated_data.gsub(line, "def VERSION_MINOR=#{minor}\r\n")
                    elsif (line.start_with?("def VERSION_PATCH"))
                        updated_data = updated_data.gsub(line, "def VERSION_PATCH=#{patch}\r\n")
                    end
                end

                File.open(path, "w") do |f|
                    f.write(updated_data)
                end

                versionName = "#{major}.#{minor}.#{patch}"
                UI.message "Android version name updated to #{versionName}"
                return Actions.lane_context[SharedValues::ANDROID_VERSION_NAME] = versionName
            end

            def self.description
                'This action updates the Android version name'
            end

            def self.is_supported?(platform)
                platform == :android
            end

            def self.author
                "david.jones@hedgehoglab.com"
            end

            def self.available_options
                [
                    FastlaneCore::ConfigItem.new(key: :path,
                                       description: "Path to your version.properties file",
                                       optional: false),
                    FastlaneCore::ConfigItem.new(key: :type,
                                      description: "Version name value to update [major, minor, patch, or none]",
                                      optional: false)
               ]
            end

            def self.output
                [
                    ['ANDROID_VERSION_NAME', 'The new version name']
                ]
            end

            def self.example_code
                [
                    'increment_android_version_name(
                        path: "/path/to/version.properties"
                        type: "patch"
                    )'
                ]
            end

            def self.category
                :project
            end
        end
    end
end