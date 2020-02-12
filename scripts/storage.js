/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2019 Marc Ruiz Altisent. All rights reserved.
 *
 *  This file is part of FoxReplace.
 *
 *  FoxReplace is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software
 *  Foundation, either version 3 of the License, or (at your option) any later version.
 *
 *  FoxReplace is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 *  A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along with FoxReplace. If not, see <http://www.gnu.org/licenses/>.
 *
 *  ***** END LICENSE BLOCK ***** */

var storage = (() => {

  const DATABASE_NAME = 'list';

  let db = new Dexie(DATABASE_NAME);
  db.version(1).stores({
    groups: '++id, enabled, mode, [enabled+mode], index',
    substitutions: '++id, groupId, index'
  });

  let storage = {

    /// Migrates the local storage list to indexed db if necessary.
    migrateToIndexedDb() {
      return browser.storage.local.get('list').then(data => {
        if (data.list !== undefined) {
          return this.setList(data.list);
        }
      });
    },

    /// Returns the whole list as a JSON object.
    async getList() {
      // TODO convert to export format
      // await db.transaction('r', db.groups, db.substitutions, async () => {
      //   for (let i = 0; i < list.groups.length; i++) {
      //     let group = list.groups[i];
      //     let groupId = await db.groups.add({
      //       name: group.name,
      //       urls: group.urls,
      //       html: group.html,
      //       enabled: Number(group.enabled),
      //       mode: group.mode,
      //       index: i
      //     });

      //     await db.substitutions.bulkAdd(group.substitutions.map((substitution, index) => {
      //       substitution.groupId = groupId;
      //       substitution.index = index;
      //       return substitution;
      //     }));
      //   }
      // });
    },

    /// Sets the given list (JSON object) as the current list in the IndexedDb.
    async setList(list) {
      console.log(list);
      // TODO version checks and upgrades
      await db.delete();
      await db.open();
      await db.transaction('rw', db.groups, db.substitutions, async () => {
        for (let i = 0; i < list.groups.length; i++) {
          let group = list.groups[i];
          let groupId = await db.groups.add({
            name: group.name,
            urls: group.urls.sort(),
            html: group.html,
            enabled: Number(group.enabled),
            mode: group.mode,
            index: i
          });

          await db.substitutions.bulkAdd(group.substitutions.map((substitution, index) => {
            substitution.groupId = groupId;
            substitution.index = index;
            return substitution;
          }));
        }
      });
    },

    /// Returns the groups with some data of their first substitution (to show in the options page).
    getGroupsPreview() {
      return db.transaction('r', db.groups, db.substitutions, async () => {
        let groups = await db.groups.orderBy('id').toArray();
        let firstSubstitutions = await db.substitutions.where({ index: 0 }).sortBy('groupId');
        return groups.map((group, index) => {
          group.enabled = Boolean(group.enabled);
          group.name = SubstitutionGroup.nonEmptyName(group);
          group.input = firstSubstitutions[index].input;
          group.output = firstSubstitutions[index].output;
          return group;
        }).sort((group1, group2) => group1.index - group2.index);
      });
    },

    /// Adds the given group (JSON object) as a new group. Returns a promise that fulfills with the group preview.
    addGroup(group) {
      return db.transaction('rw', db.groups, db.substitutions, async () => {
        group.enabled = Number(group.enabled);
        group.index = await db.groups.count();
        group.urls.sort();
        group.id = await db.groups.add(group);
        await db.substitutions.bulkAdd(group.substitutions.map((substitution, index) => {
          substitution.groupId = group.id;
          substitution.index = index;
          return substitution;
        }));
        group.enabled = Boolean(group.enabled);
        group.name = SubstitutionGroup.nonEmptyName(group);
        group.input = group.substitutions[0].input;
        group.output = group.substitutions[0].output;
        return group;
      });
    },

    /// Updates the given group (JSON object) with an existing id. Returns a promise that fulfills with the group preview.
    updateGroup(group) {
      return db.transaction('rw', db.groups, db.substitutions, async () => {
        group.enabled = Number(group.enabled);
        group.urls.sort();
        await db.groups.put(group);
        await db.substitutions.where({ groupId: group.id }).delete();
        await db.substitutions.bulkAdd(group.substitutions.map((substitution, index) => {
          substitution.groupId = group.id;
          substitution.index = index;
          return substitution;
        }));
        group.enabled = Boolean(group.enabled);
        group.name = SubstitutionGroup.nonEmptyName(group);
        group.input = group.substitutions[0].input;
        group.output = group.substitutions[0].output;
        return group;
      });
    },

    /// Returns a promise that fulfills with the group (JSON object) with the given id with all its substitutions.
    getGroup(id) {
      return db.transaction('r', db.groups, db.substitutions, async () => {
        let group = await db.groups.get(id);
        group.enabled = Boolean(group.enabled);
        group.substitutions = await db.substitutions.where({ groupId: id }).sortBy('index');
        return group;
      });
    },

    /// Deletes the group with the given id. Returns a promise that fulfills when the transaction is finished.
    deleteGroup(id) {
      return db.transaction('rw', db.groups, db.substitutions, async () => {
        await db.groups.delete(id);
        await db.substitutions.where({ groupId: id }).delete();
      });
    },

    setEnabledGroup(id, enabled) {
      return db.groups.update(id, { enabled });
    },

    moveGroup(id, from, to) {
      return db.transaction('rw', db.groups, async () => {
        if (from == to) return;

        let lower, upper, direction;
        if (from < to) {
          lower = from;
          upper = to;
          direction = 1;
        }
        else {
          lower = to;
          upper = from;
          direction = -1;
        }

        await db.groups.where('index').between(lower, upper, true, true).modify(group => {
          if (group.id == id) {
            group.index += direction;
          }
          else {
            group.index -= direction;
          }
        });
      });
    },

    // TODO LATER update group without recreating all substitutions (update substitutions)

    getPrefs() {
      return browser.storage.local.get({
        enableContextMenu: false,
        autoReplaceOnLoad: false,
        autoReplacePeriodically: false,
        autoReplacePeriod: 1,
        replaceUrls: false,
        replaceScripts: false,
        enableSubscription: false,
        subscriptionUrl: "",
        subscriptionPeriod: 1
      });
    },

    setPrefs(prefs) {
      let sanitizedPrefs = {};
      for (let p in prefs) {
        switch (p) {
          case "enableContextMenu":
          case "autoReplaceOnLoad":
          case "autoReplacePeriodically":
          case "replaceUrls":
          case "replaceScripts":
          case "enableSubscription":
            sanitizedPrefs[p] = Boolean(prefs[p]);
            break;
          case "autoReplacePeriod":
          case "subscriptionPeriod":
            sanitizedPrefs[p] = Number(prefs[p]);
            break;
          case "subscriptionUrl":
            sanitizedPrefs[p] = String(prefs[p]);
            break;
          default:
            console.warn("Unrecognized preference: ", p, prefs[p]);
            break;
        }
      }
      return browser.storage.local.set(sanitizedPrefs);
    },

    getAutomaticGroups() {
      return db.transaction('r', db.groups, db.substitutions, async () => {
        let automaticGroups = db.groups.where(['enabled', 'mode']).anyOf([[1, 'auto&manual'], [1, 'auto']]).toArray();  // TODO not sure if this part works
        // TODO fetch substitutions and construct objects
        return automaticGroups;
      });
      //return this.getList().then(list => list.filter(group => group.enabled && (group.mode == group.MODE_AUTO_AND_MANUAL || group.mode == group.MODE_AUTO)));
    },

    getManualGroups() {
      return this.getList().then(list => list.filter(group => group.enabled && (group.mode == group.MODE_AUTO_AND_MANUAL || group.mode == group.MODE_MANUAL)));
    },

    getMainColumnState() {
      return browser.storage.local.get("mainColumnState").then(result => {
        return result.mainColumnState;
      });
    },

    setMainColumnState(columnState) {
      return browser.storage.local.set({ mainColumnState: columnState });
    }

  };

  return storage;

})();
