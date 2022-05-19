import { Component, ViewChild } from '@angular/core';
import { IonReorderGroup } from '@ionic/angular';

import { LoadingController } from '@ionic/angular';
import { AuthService } from '../../auth/auth.service';
import { FirestoreService, IUser } from '../../shared/firestore.service';

import { IOrdinary } from '../../interfaces/ordinary/IOrdinary';
import { IUsersOrdinary } from '../../interfaces/users-ordinary/IUsersOrdinary';
import { IWeekday } from '../../interfaces/weekday/IWeekday';

import { OrdinariesService } from '../../api/ordinary/ordinaries.service';
import { UsrsOrdinariesService } from '../../api/users-ordinary/usrs-ordinaries.service';
import { WeekdaysService } from '../../api/weekday/weekdays.service';

@Component({
  selector: 'app-usual',
  templateUrl: './usual.page.html',
  styleUrls: ['./usual.page.scss'],
})
export class UsualPage {
  private uid: string; //userID
  private user: IUser; // User
  ordinary: IOrdinary = { name: null }; //日常
  usersOrdinary: IUsersOrdinary = {
    userId: null,
    ordinary: null,
    weekdays: [],
    startedOn: null,
    createdAt: null,
    updatedAt: null,
    isClosed: false,
  }; //ユーザごとの日常
  title: string = '日常';
  scene: string = 'everyday';
  now = new Date();

  weekdays;
  usersOrdinaries;
  ordinariesWeekday: { ordinary: IOrdinary; weekdays: IWeekday[]; scene: string }[];

  @ViewChild(IonReorderGroup) reorderGroup: IonReorderGroup;
  constructor(
    private loadingController: LoadingController,
    private auth: AuthService,
    private firestore: FirestoreService,
    private ordinaryService: OrdinariesService,
    private weekdayService: WeekdaysService,
    private usersOrdinaryService: UsrsOrdinariesService,
  ) {}

  async ngOnInit(): Promise<void> {
    const user = await this.firestore.userInit(await this.auth.getUserId());
    if (!user) {
      console.error('userがいません！');
    }
  }

  async ionViewDidEnter(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Loading...',
    });
    if (!this.ordinariesWeekday || !this.ordinariesWeekday.length) {
      await loading.present();
    }
    this.uid = await this.auth.getUserId();
    this.usersOrdinary.userId = this.uid;
    this.user = await this.firestore.userInit(this.uid);
    // weekdaysの取得
    this.weekdayService.getList().subscribe((response) => {
      this.weekdays = response;
    });

    // ログイン中のユーザが持つ日常の取得
    this.usersOrdinaryService.findAllByUid(this.uid).subscribe((response) => {
      this.usersOrdinaries = response;
      loading.dismiss();
      if (!this.usersOrdinaries) {
        this.ordinariesWeekday = [];
        return;
      }
      this.ordinariesWeekday = this.usersOrdinaries.map((uo) => {
        const weekdayLength = uo.weekdays.length;
        return {
          ordinary: uo.ordinary[0],
          weekdays: uo.weekdays,
          scene: weekdayLength === 7 ? 'everyday' : weekdayLength === 1 ? 'week' : 'weekday',
        };
      });
    });
  }

  segmentChanged(event: any): void {
    console.log(event);
  }

  toggleReorderGroup(): void {
    this.reorderGroup.disabled = !this.reorderGroup.disabled;
  }

  doReorder(event: any): void {
    if (this.scene === 'everyday') {
      //this.ordinariesWeekday.ordinary = event.detail.complete(this.ordinaries);
      this.ordinariesWeekday
        .filter((ow) => {
          return ow.scene === this.scene;
        })
        .map((ow) => {
          return {
            ...ow,
            ordinary: event.detail.complete(ow.ordinary),
          };
        });
      return;
    }
    if (this.scene === 'week') {
      //this.ordinaries = event.detail.complete(this.ordinaries);
      this.ordinariesWeekday
        .filter((ow) => {
          return ow.scene === this.scene;
        })
        .map((ow) => {
          return {
            ...ow,
            ordinary: event.detail.complete(ow.ordinary),
          };
        });
      return;
    }
    this.ordinariesWeekday
      .filter((ow) => {
        return ow.scene === 'weekday';
      })
      .map((ow) => {
        return {
          ...ow,
          ordinary: event.detail.complete(ow.ordinary),
        };
      });
    return;
  }

  async createOrdinary(): Promise<void> {
    if (!this.user) {
      alert('ログインが必要です！');
      return;
    }

    if (!this.ordinary.name) {
      alert('日常名がありません！');
      return;
    }
    if (
      !this.weekdays.filter((w) => {
        return w.isChecked;
      })
    ) {
      alert('曜日が選択されていません！');
      return;
    }
    // 日常の登録
    this.ordinaryService.postData(this.ordinary).subscribe((response) => {
      // 日常のデータを一時保存
      const tmpOrdinary = { id: response['id'], name: response['name'] };
      // 日常の入力項目初期化
      this.ordinary.name = '';
      // 登録する曜日毎にweekdaysを保存し、まとめてusersOrdinaryに追加
      const tmpWeekday: [] = this.weekdays.filter((w) => {
        return w.isChecked;
      });
      const tmpWeekdayLength: number = this.weekdays.filter((w) => {
        return w.isChecked;
      }).length;
      // 雛形作成
      this.usersOrdinary.isClosed = false;
      this.usersOrdinary.ordinary = tmpOrdinary;
      this.usersOrdinary.weekdays = tmpWeekday;
      this.usersOrdinaryService.postData(this.usersOrdinary).subscribe((res) => {
        this.ordinariesWeekday.push({
          ordinary: tmpOrdinary,
          weekdays: tmpWeekday,
          scene: tmpWeekdayLength === 7 ? 'everyday' : tmpWeekdayLength === 1 ? 'week' : 'weekday',
        });
        this.weekdays.map((w) => {
          w.isChecked = false;
        });
      });
    });
  }
}
