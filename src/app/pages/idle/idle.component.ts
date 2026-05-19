import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CatalogueService, PlaylistVideo } from '../../services/catalogue.service';
import { VideoCacheService } from '../../services/video-cache.service';

@Component({
  selector: 'app-idle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './idle.component.html',
  styleUrls: ['./idle.component.scss']
})
export class IdleComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly REFRESH_DELAY = 5 * 60 * 1000; // 5 minutos
  private readonly DEFAULT_FALLBACK_VIDEO = 'assets/videos/home_video.mp4';

  videos: PlaylistVideo[] = [];
  currentVideoIndex = 0;
  currentVideoUrl = this.DEFAULT_FALLBACK_VIDEO;
  fallbackVideoUrl = this.DEFAULT_FALLBACK_VIDEO;

  private videoStartTime: number = 0;
  private userInteracted = false;

  constructor(
    private router: Router,
    private catalogueService: CatalogueService,
    private videoCache: VideoCacheService,
  ) {}

  ngOnInit(): void {
    this.fallbackVideoUrl = this.catalogueService.getMetadata<string>(
      'texts.idle.videoFallbackUrl',
      this.DEFAULT_FALLBACK_VIDEO
    );

    this.loadPlaylistVideos();

    // Refrescar catálogo cada 5 minutos mientras se esté en idle.
    this.refreshInterval = setInterval(() => {
      console.log('🔄 Refreshing catalogue while idle...');
      this.catalogueService.refreshCatalogue();
    }, this.REFRESH_DELAY);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  onVideoCanPlay(): void {
    this.tryPlayVideo();
  }

  onVideoError(): void {
    console.warn('⚠️ Video playback error. Falling back to local video asset.');
    if (this.currentVideoUrl !== this.fallbackVideoUrl) {
      this.currentVideoUrl = this.fallbackVideoUrl;
      this.videoStartTime = Date.now();
      this.tryPlayVideo(true);
    }
  }

  private async loadPlaylistVideos(): Promise<void> {
    this.videos = this.catalogueService.getScreensaverVideos();

    if (this.videos.length > 0) {
      this.currentVideoIndex = 0;
      const remoteUrl = this.videos[0].file_url || this.videos[0].file;
      // Resolver desde caché local si existe — sino usa URL remota.
      this.currentVideoUrl = await this.videoCache.resolve(remoteUrl);
      this.videoStartTime = Date.now();
      console.log('🎬 Playlist loaded with', this.videos.length, 'videos');

      // Prefetch en background de todos los videos de la playlist + prune de
      // los que ya no estén. No bloquea — el primero ya está reproduciéndose.
      const allRemoteUrls = this.videos
        .map(v => v.file_url || v.file)
        .filter(Boolean) as string[];
      this.videoCache.cacheAll(allRemoteUrls).then(() => {
        this.videoCache.pruneStale(allRemoteUrls);
      });
    } else {
      this.currentVideoUrl = this.fallbackVideoUrl;
      this.videoStartTime = Date.now();
      console.log('⚠️ No playlist videos found, using fallback video');
    }
  }

  onVideoEnded(): void {
    if (this.videos.length <= 1) {
      this.restartCurrentVideo();
      return;
    }

    const currentVideo = this.videos[this.currentVideoIndex];
    if (currentVideo && currentVideo.duration > 0) {
      const elapsedSeconds = (Date.now() - this.videoStartTime) / 1000;
      if (elapsedSeconds < currentVideo.duration) {
        this.restartCurrentVideo();
        return;
      }
    }

    this.nextVideo();
  }

  private async nextVideo(): Promise<void> {
    this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videos.length;
    const remoteUrl = this.videos[this.currentVideoIndex].file_url || this.videos[this.currentVideoIndex].file;
    this.currentVideoUrl = await this.videoCache.resolve(remoteUrl);
    this.videoStartTime = Date.now();

    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.load();
      this.tryPlayVideo();
    }
  }

  private restartCurrentVideo(): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime = 0;
      this.tryPlayVideo();
    }
  }

  /** Toque en pantalla durante el video → directo al catálogo. */
  navigateToHome(): void {
    this.userInteracted = true;
    this.router.navigate(['/home']);
  }

  private tryPlayVideo(forceLoad = false): void {
    const video = this.videoPlayer?.nativeElement;
    if (!video) {
      return;
    }

    if (forceLoad) {
      video.load();
    }

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        if (this.userInteracted) {
          video.muted = true;
          void video.play();
        }
      });
    }
  }
}
