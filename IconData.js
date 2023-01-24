class IconData {

    constructor() {
       this._icons = IconData._load_icons();
    }

    get = (iconName, themeStr) => {
        const iconThemes = this._icons[iconName];
        if (!iconThemes) {
            throw Error(`Icon name '${iconName}' doesn't exist.`);
        }
        const icon = iconThemes[themeStr];
        if (!icon) {
            throw Error(`Icon theme '${themeStr}' doesn't exist for icon name '${iconName}'.`);
        }
        return icon;
    }

    static _load_icons() {
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
            'aleph': {
                black: require('./img/aleph-light.png'),
                white: require('./img/aleph.png'),
            },
            'back': {
                black: require('./img/back-light.png'),
                white: require('./img/back.png'),
            },
            'book': {
                black: require('./img/book-light.png'),
                white: require('./img/book.png'),
            },
            'bookmark': {
                black: require('./img/bookmark-light.png'),
                white: require('./img/bookmark.png'),
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
            'group': {
                black: require('./img/group-light.png'),
                white: require('./img/group.png'),
            },
            'hashtag': {
                black: require('./img/hashtag-light.png'),
                white: require('./img/hashtag.png'),
            },
            'heart': {
                black: require('./img/heart-light.png'),
                white: require('./img/heart.png'),
            },
            'info': {
                black: require('./img/info-light.png'),
                white: require('./img/info.png'),
            },
            'layers': {
                black: require('./img/layers-light.png'),
                white: require('./img/layers.png'),
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
            },
            'quill': {
                black: require('./img/quill-light.png'),
                white: require('./img/quill.png'),
            },
            'search': {
                black: require('./img/search-light.png'),
                white: require('./img/search.png'),
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
            'starFilled': {
                black: require('./img/starFilled-light.png'),
                white: require('./img/starFilled.png'),
            },
            'starUnfilled': {
                black: require('./img/starUnfilled-light.png'),
                white: require('./img/starUnfilled.png'),
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