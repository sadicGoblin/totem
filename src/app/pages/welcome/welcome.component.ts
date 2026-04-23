import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CatalogueService, PlaylistVideo } from '../../services/catalogue.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly REFRESH_DELAY = 5 * 60 * 1000; // 5 minutos
  private readonly DEFAULT_FALLBACK_VIDEO = 'assets/videos/home_video.mp4';
  
  // Playlist de videos
  videos: PlaylistVideo[] = [];
  currentVideoIndex = 0;
  currentVideoUrl = this.DEFAULT_FALLBACK_VIDEO;
  fallbackVideoUrl = this.DEFAULT_FALLBACK_VIDEO;
  
  // Control de tiempo para conservar video local
  private videoStartTime: number = 0;
  private userInteracted = false;

  constructor(
    private router: Router,
    private catalogueService: CatalogueService
  ) {}

  ngOnInit(): void {
    this.fallbackVideoUrl = this.catalogueService.getMetadata<string>(
      'welcome.fallbackVideoUrl',
      this.DEFAULT_FALLBACK_VIDEO
    );

    // Cargar videos de la playlist
    this.loadPlaylistVideos();
    
    // Refrescar catálogo cada 5 minutos mientras se esté en welcome.
    this.refreshInterval = setInterval(() => {
      console.log('🔄 Refreshing catalogue after 5 minutes on welcome screen...');
      this.catalogueService.refreshCatalogue();
    }, this.REFRESH_DELAY);
  }

  ngOnDestroy(): void {
    // Cancelar refresh periódico al salir de welcome
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

  /**
   * Carga los videos de la playlist vertical desde el catálogo
   */
  private loadPlaylistVideos(): void {
    this.videos = this.catalogueService.getScreensaverVideos();
    
    if (this.videos.length > 0) {
      this.currentVideoIndex = 0;
      this.currentVideoUrl = this.videos[0].file_url || this.videos[0].file;
      this.videoStartTime = Date.now();
      console.log('🎬 Playlist loaded with', this.videos.length, 'videos');
      console.log('▶️ Playing:', this.videos[0].name);
    } else {
      this.currentVideoUrl = this.fallbackVideoUrl;
      this.videoStartTime = Date.now();
      console.log('⚠️ No playlist videos found, using fallback video');
    }
  }

  /**
   * Maneja el evento cuando un video termina
   */
  onVideoEnded(): void {
    if (this.videos.length <= 1) {
      // Si solo hay un video o ninguno, reiniciar el mismo
      this.restartCurrentVideo();
      return;
    }

    // Verificar si debemos respetar la duración del video actual
    const currentVideo = this.videos[this.currentVideoIndex];
    if (currentVideo && currentVideo.duration > 0) {
      const elapsedSeconds = (Date.now() - this.videoStartTime) / 1000;
      if (elapsedSeconds < currentVideo.duration) {
        // Aún no se cumple la duración, reiniciar el video
        this.restartCurrentVideo();
        return;
      }
    }

    // Pasar al siguiente video
    this.nextVideo();
  }

  /**
   * Pasa al siguiente video de la playlist
   */
  private nextVideo(): void {
    this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videos.length;
    this.currentVideoUrl = this.videos[this.currentVideoIndex].file_url || this.videos[this.currentVideoIndex].file;
    this.videoStartTime = Date.now();
    
    console.log('▶️ Playing next video:', this.videos[this.currentVideoIndex].name);
    
    // Forzar la recarga del video
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.load();
      this.tryPlayVideo();
    }
  }

  /**
   * Reinicia el video actual
   */
  private restartCurrentVideo(): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime = 0;
      this.tryPlayVideo();
    }
  }

  navigateToCatalog() {
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
        // Algunos entornos bloquean autoplay hasta la primera interacción.
        if (this.userInteracted) {
          video.muted = true;
          void video.play();
        }
      });
    }
  }
}
