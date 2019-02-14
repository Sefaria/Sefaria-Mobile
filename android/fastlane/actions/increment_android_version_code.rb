module Fastlane
    module Actions
        module SharedValues
            ANDROID_VERSION_CODE = :ANDROID_VERSION_CODE
        end

        class IncrementAndroidVersionCodeAction < Action
            def self.run(params)
                path = params[:path]
                buildNumber = 0

                foundBuild = false

                data = File.read(path)
                updated_data = data
                data.each_line do |line|
                     if (line.start_with?('def VERSION_BUILD'))
                         foundBuild = true
                         buildNumber =  line.delete("def VERSION_BUILD=").to_i + 1
                         updated_data = updated_data.gsub(line, "def VERSION_BUILD=#{buildNumber}\r\n")
                     end
                 end

                 if (!foundBuild)
                     UI.error "VERSION_BUILD not found in build.gradle file, please ensure file contains 'def VERSION_BUILD=0' declaration"
                     raise "Illegal Argument Exception : No VERSION_BUILD variable in build.gradle file"
                 end

                File.open(path, "w") do |f|
                     f.write(updated_data)
                 end

                UI.message "Android version code incremented to #{buildNumber}"
                return Actions.lane_context[SharedValues::ANDROID_VERSION_CODE] = buildNumber
            end

            def self.description
                'Increment the version code value in your projects version.properties file '
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
                                       optional: false)
                ]
            end

            def self.output
                [
                    ['ANDROID_VERSION_CODE', 'The new version code']
                ]
            end

            def self.example_code
                [
                    'increment_android_version_code(
                        path: "/path/to/version.properties"
                    )'
                ]
            end

            def self.category
                :project
            end
        end
    end
end