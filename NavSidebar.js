import React from 'react';
import {View} from 'react-native';
import {BasicLearningScheduleBox} from "./LearningSchedules";

export const NavSidebar = ({ modules }) => {
    return (
        <View>
            {modules.map((m, i) =>
                <Modules
                    type={m.type}
                    props={m.props || {}}
                    key={i}
                />
            )}
        </View>
    );
};

const WeeklyTorahPortion = ({ openRef }) => <BasicLearningScheduleBox openRef={openRef} desiredCalendarTitles={['Parashat Hashavua', 'Haftarah']} titleKey={"weeklyTorahPortion"} />;
const DafYomi = ({ openRef }) => <BasicLearningScheduleBox openRef={openRef} desiredCalendarTitles={['Daf Yomi']} titleKey={"dafYomi"} />;

const Modules = ({type, props}) => {
    // Choose the appropriate module component to render by `type`
    const moduleTypes = {
        //"SupportSefaria":         SupportSefaria,
        //"LearningSchedules":      LearningSchedules,
        "WeeklyTorahPortion":     WeeklyTorahPortion,
        "DafYomi":                DafYomi,
        //"AboutTopics":            AboutTopics,
        //"TrendingTopics":         TrendingTopics,
        //"RelatedTopics":          RelatedTopics,
    };
    if (!type) { return null; }
    const ModuleType = moduleTypes[type];
    return <ModuleType {...props} />
};

