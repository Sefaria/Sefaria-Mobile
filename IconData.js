class IconData {

    constructor() {
       this._icons = IconData._load_icons();
    }

    get = (iconName, themeStr, isSelected=false) => {
        const iconThemes = this._icons[iconName];
        if (!iconThemes) {
            throw Error(`Icon name '${iconName}' doesn't exist.`);
        }
        const icon = iconThemes[this._getColorKey(themeStr, isSelected)];
        if (!icon) {
            throw Error(`Icon theme '${themeStr}' doesn't exist for icon name '${iconName}'.`);
        }
        return icon;
    }

    _getColorKey(themeStr, isSelected) {
        return `${themeStr}${isSelected ? "_selected" : ""}`;
    }

    static _load_icons() {
        //TODO: these icons should really be named for their user case and not a arbitrary "shade"! 
        return {
            'a-aleph': {
                black: require('./img/a-aleph-light.png'),
                white: require('./img/a-aleph.png'),
            },
            'a_aleph': {
                black: require('./img/a_aleph-light.png'),
                white: require('./img/a_aleph.png'),
            },
            'a_icon': {
                black: require('./img/a_icon-light.png'),
                white: require('./img/a_icon.png'),
            },
            'a_icon_small': {
                black: require('./img/a_icon_small-light.png'),
                white: require('./img/a_icon_small.png'),
            },
            'about': {
                black: require('./img/info-2-light.png'),
                white: require('./img/info-2.png'),
            },
            'aleph': {
                black: require('./img/aleph-light.png'),
                white: require('./img/aleph.png'),
            },
            'back': {
                black: require('./img/back-light.png'),
                white: require('./img/back.png'),
            },
            'bell': {
                black: require('./img/bell-2-light.png'),
                white: require('./img/bell-2.png'),
            },
            'book': {
                black: require('./img/book-light.png'),
                white: require('./img/book.png'),
                black_selected: require('./img/book-white.png'),
                white_selected: require('./img/book-black.png'),
            },
            'bookmark-double': {
                black: require('./img/bookmark-double-light.png'),
                white: require('./img/bookmark-double.png'),
                black_selected: require('./img/bookmark-double-white.png'),
                white_selected: require('./img/bookmark-double-dark.png'),
            },
            'bookmark-unfilled': {
                black: require('./img/bookmark-unfilled-light.png'),
                white: require('./img/bookmark-unfilled.png'),
            },
            'bookmark-filled': {
                black: require('./img/bookmark-filled-light.png'),
                white: require('./img/bookmark-filled.png'),
            },
            'bookmark2': {
                black: require('./img/bookmark2-light.png'),
                white: require('./img/bookmark2.png'),
                black_selected: require('./img/bookmark2-white.png'),
                white_selected: require('./img/bookmark2-dark.png'), //#666666
            },
            'breaks': {
                black: require('./img/breaks-light.png'),
                white: require('./img/breaks.png'),
            },
            'bubble': {
                black: require('./img/bubble-light.png'),
                white: require('./img/bubble.png'),
            },
            'caret': {
                black: require('./img/caret-light.png'),
                white: require('./img/caret.png'),
            },
            'category': {
                black: require('./img/category-light.png'),
                white: require('./img/category.png'),
            },
            'checkbox-checked': {
                black: require('./img/checkbox-checked-light.png'),
                white: require('./img/checkbox-checked.png'),
            },
            'checkbox-partially': {
                black: require('./img/checkbox-partially-light.png'),
                white: require('./img/checkbox-partially.png'),
            },
            'checkbox-unchecked': {
                black: require('./img/checkbox-unchecked-light.png'),
                white: require('./img/checkbox-unchecked.png'),
            },
            'circle-close': {
                black: require('./img/circle-close-light.png'),
                white: require('./img/circle-close.png'),
            },
            'clock': {
                black: require('./img/clock-light.png'),
                white: require('./img/clock.png'),
                black_selected: require('./img/clock-white.png'),
                white_selected: require('./img/clock-dark.png'),
            },
            'close': {
                black: require('./img/close-light.png'),
                white: require('./img/close.png'),
            },
            'continuous': {
                black: require('./img/continuous-light.png'),
                white: require('./img/continuous.png'),
            },
            'dots': {
                black: require('./img/dots-light.png'),
                white: require('./img/dots.png'),
            },
            'down': {
                black: require('./img/down-light.png'),
                white: require('./img/down.png'),
            },
            'externalLink': {
                black: require('./img/externalLink-light.png'),
                white: require('./img/externalLink.png'),
            },
            'feedback': {
                black: require('./img/feedback-light.png'),
                white: require('./img/feedback.png'),
            },
            'forward': {
                black: require('./img/forward-light.png'),
                white: require('./img/forward.png'),
            },
            'globe': {
                black: require('./img/globe-8-light.png'),
                white: require('./img/globe-8.png'),
            },
            'group': {
                black: require('./img/group-light.png'),
                white: require('./img/group.png'),
            },
            'hashtag': {
                black: require('./img/hashtag-light.png'),
                white: require('./img/hashtag.png'),
                black_selected: require('./img/hashtag-white.png'),
                white_selected: require('./img/hashtag-black.png'),
            },
            'heart': {
                black: require('./img/heart-light.png'),
                white: require('./img/heart.png'),
            },
            'heart-white': {
                black: require('./img/heart-white.png'),
                white: require('./img/heart-white.png'),
            },
            'help': {
                black: require('./img/question-thin-light.png'),
                white: require('./img/question-thin.png'),
            },
            'info': {
                black: require('./img/info-light.png'),
                white: require('./img/info.png'),
            },
            'layers': {
                black: require('./img/layers-light.png'),
                white: require('./img/layers.png'),
            },
            'login': {
                black: require('./img/login-light.png'),
                white: require('./img/login.png'),
            },
            'logout': {
                black: require('./img/logout-light.png'),
                white: require('./img/logout.png'),
            },
            'mail': {
                black: require('./img/mail-light.png'),
                white: require('./img/mail.png'),
            },
            'menu': {
                black: require('./img/menu-light.png'),
                white: require('./img/menu.png'),
            },
            'profile': {
                black: require('./img/profile-light.png'),
                white: require('./img/profile.png'),
                black_selected: require('./img/profile-white.png'),
                white_selected: require('./img/profile-black.png'),
            },
            'profile-nav': {
                black: require('./img/profile-sefaria.png'),
                white: require('./img/profile-sefaria.png'),
            },
            'quill': {
                black: require('./img/quill-light.png'),
                white: require('./img/quill.png'),
            },
            'search': {
                black: require('./img/search-light.png'),
                white: require('./img/search.png'),
                black_selected: require('./img/search-white.png'),
                white_selected: require('./img/search-black.png'),
            },
            'settings': {
                black: require('./img/settings-light.png'),
                white: require('./img/settings.png'),
            },
            'share': {
                black: require('./img/share-light.png'),
                white: require('./img/share.png'),
            },
            'sheet': {
                black: require('./img/sheet-light.png'),
                white: require('./img/sheet.png'),
                black_selected: require('./img/sheet-white.png'),
                white_selected: require('./img/sheet-black.png'),
            },
            'sidebyside': {
                black: require('./img/sidebyside-light.png'),
                white: require('./img/sidebyside.png'),
            },
            'sidebysiderev': {
                black: require('./img/sidebysiderev-light.png'),
                white: require('./img/sidebysiderev.png'),
            },
            'stacked': {
                black: require('./img/stacked-light.png'),
                white: require('./img/stacked.png'),
            },
            'sync': {
                black: require('./img/sync-light.png'),
                white: require('./img/sync.png'),
            },
            'up': {
                black: require('./img/up-light.png'),
                white: require('./img/up.png'),
            },
            'user': {
                black: require('./img/user-light.png'),
                white: require('./img/user.png'),
            },
            
        }
    }
}

export const iconData = new IconData();
